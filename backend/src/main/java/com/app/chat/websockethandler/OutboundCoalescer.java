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
 * Conflation + backpressure cho đường giao WebSocket.
 * <p>
 * Thay vì gọi {@code session.sendMessage(...)} blocking ngay trên thread của Redis listener,
 * payload được {@link #enqueue(WebSocketSession, String) gom} vào buffer per-session (bounded);
 * một pool flusher (shard theo session) drain mỗi {@code flushIntervalMs}ms thành ĐÚNG 1
 * BATCH frame. Burst N tin tới 1 user: N frame -> 1 frame; tổng N² send -> N send.
 * <p>
 * Bounded queue + drop-oldest = backpressure: client chậm không bao giờ tích quá
 * {@code maxPendingPerSession} payload, nên không buffer vô hạn -> chống OOM.
 * <p>
 * Drop xảy ra khi DRAIN (flush) chậm hơn INBOUND: mỗi flusher gửi blocking 1 lần/session/tick,
 * nên nếu 1 chu kỳ > flushIntervalMs thì queue phình tới cap rồi drop. Tăng {@code ws.coalescer.shards}
 * (drain song song hơn — ưu tiên) hoặc {@code ws.coalescer.max-pending} (buffer lớn hơn — tốn heap).
 */
@Component
public class OutboundCoalescer {

    private static final Logger logger = LoggerFactory.getLogger(OutboundCoalescer.class);

    @Value("${ws.coalescer.flush-ms:50}")
    private int flushIntervalMs;             // cửa sổ gom (latency trần thêm ~chừng này ms)

    @Value("${ws.coalescer.max-pending:512}")
    private int maxPendingPerSession;        // bounded -> chống OOM; đầy = drop oldest

    // Số flusher thread. Send là I/O-BLOCKING nên tách KHỎI số core (nhiều thread hơn core vẫn
    // tăng throughput vì phần lớn thời gian chờ I/O) — đây là cách chính chống drop. Shard theo
    // session => mỗi session luôn cùng 1 thread => GIỮ THỨ TỰ tin trong 1 session.
    @Value("${ws.coalescer.shards:32}")
    private int shardCount;

    private final List<ConcurrentHashMap<WebSocketSession, ArrayBlockingQueue<String>>> shards = new ArrayList<>();
    private ScheduledExecutorService[] flushers;

    // Đếm tin bị drop do queue đầy (backpressure). Dùng để phân biệt "mất do drop" vs
    // "chậm/đuôi-bị-cắt" khi load test: nếu droppedTotal > 0 thì tăng SETTLE_MS sẽ KHÔNG
    // đưa fully_delivered về 100% — đó là drop thật, không phải drain chậm.
    private final AtomicLong droppedTotal = new AtomicLong();
    private long lastLoggedDropped = 0;          // chỉ thread monitor đọc/ghi
    private ScheduledExecutorService monitor;

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
                Thread t = new Thread(r, "ws-flusher-" + idx);
                t.setDaemon(true);
                return t;
            });
            flushers[i].scheduleAtFixedRate(
                    () -> flushShard(idx), flushIntervalMs, flushIntervalMs, TimeUnit.MILLISECONDS);
        }
        logger.info("OutboundCoalescer started: {} shards, flush {}ms, cap {}/session",
                shardCount, flushIntervalMs, maxPendingPerSession);

        // Log số drop tích lũy mỗi 5s (chỉ khi tăng) -> theo dõi backpressure trong lúc load test.
        monitor = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "ws-coalescer-monitor");
            t.setDaemon(true);
            return t;
        });
        monitor.scheduleAtFixedRate(() -> {
            long d = droppedTotal.get();
            if (d > lastLoggedDropped) {
                logger.warn("OutboundCoalescer dropped {} messages so far (backpressure: queue full, cap {}/session)",
                        d, maxPendingPerSession);
                lastLoggedDropped = d;
            }
        }, 5, 5, TimeUnit.SECONDS);
    }

    private int shardOf(WebSocketSession session) {
        return (session.getId().hashCode() & 0x7fffffff) % shardCount;
    }

    /** Gom thay vì gửi. Queue đầy (consumer chậm) -> drop oldest, KHÔNG buffer vô hạn. */
    public void enqueue(WebSocketSession session, String payload) {
        ArrayBlockingQueue<String> q = shards.get(shardOf(session))
                .computeIfAbsent(session, s -> new ArrayBlockingQueue<>(maxPendingPerSession));
        if (!q.offer(payload)) {
            q.poll();          // drop oldest (backpressure)
            q.offer(payload);
            droppedTotal.incrementAndGet();
        }
    }

    private void flushShard(int idx) {
        ConcurrentHashMap<WebSocketSession, ArrayBlockingQueue<String>> shard = shards.get(idx);
        for (Map.Entry<WebSocketSession, ArrayBlockingQueue<String>> entry : shard.entrySet()) {
            WebSocketSession session = entry.getKey();
            if (!session.isOpen()) {           // dọn session đã đóng (kể cả khi rỗng)
                shard.remove(session);
                continue;
            }
            ArrayBlockingQueue<String> q = entry.getValue();
            if (q.isEmpty()) {
                continue;
            }
            List<String> batch = new ArrayList<>(q.size());
            q.drainTo(batch);
            if (batch.isEmpty()) {
                continue;
            }
            try {
                session.sendMessage(new TextMessage(OutboundFrames.batch(batch)));
            } catch (Exception e) {
                // Thường là race "session has been closed" (đóng giữa isOpen() và send) — KHÔNG
                // phải lỗi; chỉ cần bỏ session. DEBUG + không in stacktrace để khỏi spam khi N lớn.
                logger.debug("Flush failed for session={} ({}); dropping buffer", session.getId(), e.toString());
                shard.remove(session);
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
            logger.warn("OutboundCoalescer stopped: total dropped = {} messages (backpressure)", d);
        }
    }
}
