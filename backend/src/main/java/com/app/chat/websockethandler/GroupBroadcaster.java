package com.app.chat.websockethandler;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Callable;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Pha 1 — Shared-buffer broadcast + group-level windowed conflation cho đường GROUP fan-out.
 * <p>
 * <b>Vì sao:</b> trong 1 group, frame ra tới MỌI member là GIỐNG HỆT. Đường cũ
 * ({@link OutboundCoalescer} enqueue per-session) coi mỗi lượt giao là 1 việc riêng → burst
 * 3000 tin × 3000 member = ~9M enqueue + tới 3000 lần dựng frame ⇒ O(N²) CPU, ~21s drain.
 * <p>
 * <b>Cách làm:</b> không enqueue per-session nữa. {@link RedisMessageListener} chỉ
 * {@link #append(long, List, String) nối} payload vào buffer của group (O(1)). Một pool flusher
 * (shard theo {@code groupId} → 1 group luôn cùng 1 thread ⇒ GIỮ THỨ TỰ tin trong group) cứ mỗi
 * {@code flushIntervalMs} dựng frame MỘT LẦN/group/cửa sổ rồi ghi CÙNG một {@link TextMessage}
 * tới mọi session local của member. Chi phí dựng: O(N²) → O(N); phần còn lại chỉ là đẩy bytes
 * ra socket (sàn bandwidth, không tránh được).
 * <p>
 * <b>Đúng đắn:</b> đây thuần là đường nhanh real-time. DB vẫn là nguồn chân lý (mọi tin đã
 * {@code save()} ở inbound); buffer đầy → drop-oldest + đếm, member lấy lại từ DB khi đọc/reconnect.
 * <p>
 * <b>Direct / cross-group KHÔNG đi qua đây</b> — vẫn dùng {@link OutboundCoalescer} per-session
 * (Option A: tách 2 đường, xem plan §5.2). Một session có thể nhận song song cả 2 đường;
 * {@code ConcurrentWebSocketSessionDecorator} đã serialize ghi nên an toàn protocol.
 * <p>
 * <b>Lưu ý single-group:</b> shard theo groupId nên 1 group khổng lồ (kịch bản load test = 1 group)
 * dồn mọi socket write vào 1 thread/cửa sổ. Trên localhost (write nhanh) vẫn ổn; cải thiện tail
 * latency khi client thật chậm là việc của Pha sau (1 virtual thread/session, Java 21 — plan §6).
 */
@Component
public class GroupBroadcaster {

    private static final Logger logger = LoggerFactory.getLogger(GroupBroadcaster.class);

    @Value("${ws.group-broadcaster.flush-ms:50}")
    private int flushIntervalMs;             // cửa sổ gom (latency trần thêm ~chừng này ms)

    @Value("${ws.group-broadcaster.max-pending:8192}")
    private int maxPendingPerGroup;          // bounded -> chống OOM; đầy = drop oldest (DB là lưới)

    // Shard theo groupId => mỗi group luôn cùng 1 thread => GIỮ THỨ TỰ tin trong group. Send là
    // I/O-blocking nên tách KHỎI số core (nhiều thread vẫn tăng throughput vì phần lớn chờ I/O).
    @Value("${ws.group-broadcaster.shards:16}")
    private int shardCount;

    // SONG SONG HÓA FAN-OUT TRONG 1 GROUP (TÙY CHỌN, MẶC ĐỊNH TẮT = 1 luồng tuần tự):
    // 1 group khổng lồ chỉ rơi vào 1 shard => mọi socket write dồn 1 thread. Đặt >1 để chia member
    // của cửa sổ ra nhiều luồng ghi song song; thứ tự per-session vẫn giữ vì flushShard CHỜ
    // (invokeAll) cả cửa sổ xong mới return, và 1 shard không bao giờ chạy chồng chính nó.
    // CẢNH BÁO: chỉ có lợi khi máy CÒN core rảnh. Trên localhost (k6 + cả stack cùng máy) CPU đã bão
    // hoà -> tăng luồng làm CHẬM hơn (tranh CPU với k6). Chỉ nâng khi load generator chạy MÁY KHÁC.
    // 0 hoặc 1 => tuần tự (ghi thẳng trên thread flusher, không qua pool). Java 17: platform-thread.
    @Value("${ws.group-broadcaster.fanout-threads:1}")
    private int fanoutThreads;
    private ExecutorService fanoutPool;
    private int fanoutWorkers;

    private final LocalSessionManagement localSessionManagement;

    private final List<ConcurrentHashMap<Long, GroupBuffer>> shards = new ArrayList<>();
    private ScheduledExecutorService[] flushers;

    // Đếm tin bị drop do buffer đầy (backpressure) — phân biệt "mất do drop" vs "drain chậm" khi
    // load test, giống droppedTotal của OutboundCoalescer.
    private final AtomicLong droppedTotal = new AtomicLong();
    private long lastLoggedDropped = 0;          // chỉ thread monitor đọc/ghi
    private ScheduledExecutorService monitor;

    public GroupBroadcaster(LocalSessionManagement localSessionManagement) {
        this.localSessionManagement = localSessionManagement;
    }

    /** Buffer pending của 1 group: danh sách member (mới nhất) + hàng đợi payload (bounded). */
    private static final class GroupBuffer {
        // Member của group ~ổn định giữa các tin trong cửa sổ; giữ list mới nhất để flusher resolve
        // session local. volatile vì append (listener thread) ghi, flusher đọc.
        volatile List<String> targetUserIds;
        final ArrayBlockingQueue<String> pending;

        // ── ĐO DRAIN (diagnostic) — chỉ thread flusher của shard này đọc/ghi nên KHÔNG cần atomic.
        // burstStartNanos != 0 nghĩa là đang trong 1 đợt drain; reset về 0 khi buffer rỗng lại.
        // Mục tiêu: tách "server bận ghi (in-send)" khỏi "tổng thời gian drain (wall)" -> nếu
        // in-send ≈ wall thì flusher kẹt trong sendMessage = backpressure (consumer/k6 đọc không kịp).
        long burstStartNanos;
        long writeNanos;        // tổng thời gian NẰM TRONG vòng ghi socket của đợt
        long flushedMsgs;       // tổng tin đã flush trong đợt
        long sessionWrites;     // tổng lượt ghi session trong đợt (≈ members × số cửa sổ)

        GroupBuffer(int cap) {
            this.pending = new ArrayBlockingQueue<>(cap);
        }
    }

    @PostConstruct
    public void start() {
        if (shardCount < 1) {
            shardCount = 1;
        }
        flushers = new ScheduledExecutorService[shardCount];
        for (int i = 0; i < shardCount; i++) {
            shards.add(new ConcurrentHashMap<>());
            final int idx = i;
            flushers[i] = Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "group-broadcaster-" + idx);
                t.setDaemon(true);
                return t;
            });
            flushers[i].scheduleAtFixedRate(
                    () -> flushShard(idx), flushIntervalMs, flushIntervalMs, TimeUnit.MILLISECONDS);
        }
        // <=1 => tuần tự (không pool); >1 => pool song song. availableProcessors chỉ dùng nếu >1.
        fanoutWorkers = Math.max(1, fanoutThreads);
        if (fanoutWorkers > 1) {
            fanoutPool = Executors.newFixedThreadPool(fanoutWorkers, r -> {
                Thread t = new Thread(r, "group-fanout");
                t.setDaemon(true);
                return t;
            });
        }

        logger.info("GroupBroadcaster started: {} shards, flush {}ms, cap {}/group, {} fanout threads",
                shardCount, flushIntervalMs, maxPendingPerGroup, fanoutWorkers);

        monitor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "group-broadcaster-monitor");
            t.setDaemon(true);
            return t;
        });
        monitor.scheduleAtFixedRate(() -> {
            long d = droppedTotal.get();
            if (d > lastLoggedDropped) {
                logger.warn("GroupBroadcaster dropped {} messages so far (backpressure: buffer full, cap {}/group)",
                        d, maxPendingPerGroup);
                lastLoggedDropped = d;
            }
        }, 5, 5, TimeUnit.SECONDS);
    }

    private int shardOf(long groupId) {
        return (int) ((groupId ^ (groupId >>> 32)) & 0x7fffffff) % shardCount;
    }

    /**
     * O(1): nối payload vào buffer của group thay vì loop N member để enqueue per-session.
     * Buffer đầy (drain chậm hơn inbound) -> drop oldest + đếm, KHÔNG buffer vô hạn (DB là lưới).
     */
    public void append(long groupId, List<String> targetUserIds, String payload) {
        GroupBuffer buf = shards.get(shardOf(groupId))
                .computeIfAbsent(groupId, g -> new GroupBuffer(maxPendingPerGroup));
        buf.targetUserIds = targetUserIds;     // member list ~đồng nhất trong cửa sổ; giữ mới nhất
        if (!buf.pending.offer(payload)) {
            buf.pending.poll();                // drop oldest (backpressure)
            buf.pending.offer(payload);
            droppedTotal.incrementAndGet();
        }
    }

    private void flushShard(int idx) {
        ConcurrentHashMap<Long, GroupBuffer> shard = shards.get(idx);
        for (Map.Entry<Long, GroupBuffer> entry : shard.entrySet()) {
            GroupBuffer buf = entry.getValue();
            if (buf.pending.isEmpty()) {
                // Buffer rỗng: nếu vừa kết thúc 1 đợt drain -> log số liệu rồi reset.
                if (buf.burstStartNanos != 0L) {
                    long wallMs = (System.nanoTime() - buf.burstStartNanos) / 1_000_000L;
                    long inSendMs = buf.writeNanos / 1_000_000L;
                    logger.info("Group {} drain xong: {} tin, {} lượt ghi-session | wall {}ms, in-send {}ms "
                                    + "({}% thời gian nằm trong sendMessage => {})",
                            entry.getKey(), buf.flushedMsgs, buf.sessionWrites, wallMs, inSendMs,
                            wallMs > 0 ? (inSendMs * 100 / wallMs) : 0,
                            wallMs > 0 && inSendMs * 100 / wallMs >= 80
                                    ? "BACKPRESSURE: kẹt ghi socket (consumer đọc không kịp)"
                                    : "flusher RẢNH phần lớn (chờ tin tới / nút thắt ngoài server)");
                    buf.burstStartNanos = 0L;
                }
                continue;
            }
            // Bắt đầu 1 đợt drain mới -> mốc thời gian + reset bộ đếm.
            if (buf.burstStartNanos == 0L) {
                buf.burstStartNanos = System.nanoTime();
                buf.writeNanos = 0L;
                buf.flushedMsgs = 0L;
                buf.sessionWrites = 0L;
            }

            List<String> drained = new ArrayList<>(buf.pending.size());
            buf.pending.drainTo(drained);
            if (drained.isEmpty()) {
                continue;
            }
            List<String> members = buf.targetUserIds;
            if (members == null || members.isEmpty()) {
                continue;
            }

            // DỰNG 1 LẦN cho cả group — frame ra tới mọi member là giống hệt (frame bất biến =>
            // an toàn cho nhiều luồng ghi chung).
            final TextMessage frame = new TextMessage(OutboundFrames.batch(drained));

            long writeStart = System.nanoTime();
            if (fanoutPool == null) {
                // Tuần tự (mặc định): ghi thẳng trên thread flusher, không overhead pool.
                writeChunk(members, frame);
            } else {
                // Chia member của cửa sổ này ra fanoutWorkers khúc, ghi SONG SONG, rồi CHỜ xong hết.
                // invokeAll block tới khi mọi khúc ghi xong -> cửa sổ N hoàn tất trước cửa sổ N+1
                // => giữ thứ tự per-session. 1 member chỉ ở đúng 1 khúc nên không có 2 luồng đụng cùng
                // session (ConcurrentWebSocketSessionDecorator vốn cũng serialize ghi theo từng session).
                int total = members.size();
                int chunk = (total + fanoutWorkers - 1) / fanoutWorkers;
                List<Callable<Void>> tasks = new ArrayList<>();
                for (int from = 0; from < total; from += chunk) {
                    final List<String> slice = members.subList(from, Math.min(from + chunk, total));
                    tasks.add(() -> { writeChunk(slice, frame); return null; });
                }
                try {
                    fanoutPool.invokeAll(tasks);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;          // shutdown -> dừng cửa sổ này, không ghi tiếp
                }
            }
            buf.writeNanos += System.nanoTime() - writeStart;
            buf.flushedMsgs += drained.size();
            buf.sessionWrites += members.size();
        }
    }

    /** Ghi CÙNG frame tới mọi session local của các member trong khúc (build-once, write-to-many). */
    private void writeChunk(List<String> members, TextMessage frame) {
        for (String userId : members) {
            ConcurrentHashMap<String, WebSocketSession> connections =
                    localSessionManagement.getUserConnections(userId);
            if (connections == null || connections.isEmpty()) {
                continue;          // member offline / ở instance khác -> đọc lại từ DB
            }
            for (WebSocketSession session : connections.values()) {
                if (session == null || !session.isOpen()) {
                    continue;
                }
                try {
                    session.sendMessage(frame);
                } catch (Exception e) {
                    // Thường là race "session đóng giữa isOpen() và send" — KHÔNG phải lỗi.
                    // DEBUG + không stacktrace để khỏi spam khi N lớn (ghi log tranh CPU với flusher).
                    logger.debug("Group flush failed for session={} ({}); skipped",
                            session.getId(), e.toString());
                }
            }
        }
    }

    @PreDestroy
    public void stop() {
        if (flushers != null) {
            for (ScheduledExecutorService f : flushers) {
                f.shutdownNow();
            }
        }
        if (monitor != null) {
            monitor.shutdownNow();
        }
        if (fanoutPool != null) {
            fanoutPool.shutdownNow();
        }
        long d = droppedTotal.get();
        if (d > 0) {
            logger.warn("GroupBroadcaster stopped: total dropped = {} messages (backpressure)", d);
        }
    }
}
