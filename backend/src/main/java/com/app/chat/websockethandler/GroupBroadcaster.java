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
import java.util.concurrent.ConcurrentHashMap;
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
        logger.info("GroupBroadcaster started: {} shards, flush {}ms, cap {}/group",
                shardCount, flushIntervalMs, maxPendingPerGroup);

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
                continue;
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

            // DỰNG 1 LẦN cho cả group — frame ra tới mọi member là giống hệt.
            TextMessage frame = new TextMessage(OutboundFrames.batch(drained));

            // Ghi CÙNG frame tới mọi session local của member (fan-out-on-write, build-once).
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
        long d = droppedTotal.get();
        if (d > 0) {
            logger.warn("GroupBroadcaster stopped: total dropped = {} messages (backpressure)", d);
        }
    }
}
