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

@Component
public class OutboundCoalescer {

    private static final Logger logger = LoggerFactory.getLogger(OutboundCoalescer.class);

    @Value("${ws.coalescer.flush-ms:50}")
    private int flushIntervalMs;

    @Value("${ws.coalescer.max-pending:512}")
    private int maxPendingPerSession;

    @Value("${ws.coalescer.shards:32}")
    private int shardCount;

    private final List<ConcurrentHashMap<WebSocketSession, ArrayBlockingQueue<String>>> shards = new ArrayList<>();
    private ScheduledExecutorService[] flushers;

    private final AtomicLong droppedTotal = new AtomicLong();
    private long lastLoggedDropped = 0;
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

    public void enqueue(WebSocketSession session, String payload) {
        ArrayBlockingQueue<String> q = shards.get(shardOf(session))
                .computeIfAbsent(session, s -> new ArrayBlockingQueue<>(maxPendingPerSession));
        if (!q.offer(payload)) {
            q.poll();
            q.offer(payload);
            droppedTotal.incrementAndGet();
        }
    }

    private void flushShard(int idx) {
        ConcurrentHashMap<WebSocketSession, ArrayBlockingQueue<String>> shard = shards.get(idx);
        for (Map.Entry<WebSocketSession, ArrayBlockingQueue<String>> entry : shard.entrySet()) {
            WebSocketSession session = entry.getKey();
            if (!session.isOpen()) {
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
