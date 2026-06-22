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
import java.util.concurrent.ExecutionException;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

@Component
public class GroupBroadcaster {

    private static final Logger logger = LoggerFactory.getLogger(GroupBroadcaster.class);

    @Value("${ws.group-broadcaster.flush-ms:20}")
    private int flushIntervalMs;

    @Value("${ws.group-broadcaster.max-pending:8192}")
    private int maxPendingPerGroup;

    @Value("${ws.group-broadcaster.shards:16}")
    private int shardCount;

    @Value("${ws.group-broadcaster.fanout-threads:4}")
    private int fanoutThreads;
    private ExecutorService fanoutPool;
    private int fanoutWorkers;

    private final LocalSessionManagement localSessionManagement;

    private final List<ConcurrentHashMap<Long, GroupBuffer>> shards = new ArrayList<>();
    private ScheduledExecutorService[] flushers;

    private final AtomicLong droppedTotal = new AtomicLong();
    private long lastLoggedDropped = 0;
    private ScheduledExecutorService monitor;

    public GroupBroadcaster(LocalSessionManagement localSessionManagement) {
        this.localSessionManagement = localSessionManagement;
    }

    private static final class GroupBuffer {

        volatile List<String> targetUserIds;
        final ArrayBlockingQueue<String> pending;

        long burstStartNanos;
        long writeNanos;
        long sendNanos;
        long bytesWritten;
        long flushedMsgs;
        long sessionWrites;

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

    public void append(long groupId, List<String> targetUserIds, String payload) {
        GroupBuffer buf = shards.get(shardOf(groupId))
                .computeIfAbsent(groupId, g -> new GroupBuffer(maxPendingPerGroup));
        buf.targetUserIds = targetUserIds;
        if (!buf.pending.offer(payload)) {
            buf.pending.poll();
            buf.pending.offer(payload);
            droppedTotal.incrementAndGet();
        }
    }

    private void flushShard(int idx) {
        ConcurrentHashMap<Long, GroupBuffer> shard = shards.get(idx);
        for (Map.Entry<Long, GroupBuffer> entry : shard.entrySet()) {
            GroupBuffer buf = entry.getValue();
            if (buf.pending.isEmpty()) {

                if (buf.burstStartNanos != 0L) {
                    long wallMs   = (System.nanoTime() - buf.burstStartNanos) / 1_000_000L;
                    long writeMs  = buf.writeNanos / 1_000_000L;
                    long sendMs   = buf.sendNanos / 1_000_000L;
                    long sendPct  = wallMs > 0 ? (sendMs * 100 / wallMs) : 0;
                    double mb     = buf.bytesWritten / 1_000_000.0;

                    double mbPerSec = buf.writeNanos > 0
                            ? mb / (buf.writeNanos / 1_000_000_000.0) : 0.0;
                    logger.info("Group {} drain xong: {} tin, {} lượt ghi-session, {} MB | wall {}ms, write {}ms, "
                                    + "send {}ms ({}% wall nằm trong sendMessage), {} MB/s qua socket => {}",
                            entry.getKey(), buf.flushedMsgs, buf.sessionWrites,
                            String.format("%.1f", mb), wallMs, writeMs, sendMs, sendPct,
                            String.format("%.1f", mbPerSec),

                            sendPct >= 80
                                    ? "kẹt ghi socket (consumer đọc không kịp HOẶC chạm sàn băng thông — xem MB/s)"
                                    : "flusher RẢNH phần lớn (chờ tin tới / nút thắt ngoài server)");
                    buf.burstStartNanos = 0L;
                }
                continue;
            }

            if (buf.burstStartNanos == 0L) {
                buf.burstStartNanos = System.nanoTime();
                buf.writeNanos = 0L;
                buf.sendNanos = 0L;
                buf.bytesWritten = 0L;
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

            final TextMessage frame = new TextMessage(OutboundFrames.batch(drained));

            long writeStart = System.nanoTime();
            if (fanoutPool == null) {

                long[] m = writeChunk(members, frame);
                buf.sendNanos += m[0];
                buf.bytesWritten += m[1];
            } else {

                int total = members.size();
                int chunk = (total + fanoutWorkers - 1) / fanoutWorkers;
                List<Callable<long[]>> tasks = new ArrayList<>();
                for (int from = 0; from < total; from += chunk) {
                    final List<String> slice = members.subList(from, Math.min(from + chunk, total));
                    tasks.add(() -> writeChunk(slice, frame));
                }
                try {

                    List<Future<long[]>> results = fanoutPool.invokeAll(tasks);
                    for (Future<long[]> f : results) {
                        long[] m = f.get();
                        buf.sendNanos += m[0];
                        buf.bytesWritten += m[1];
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    return;
                } catch (ExecutionException e) {

                    logger.debug("fanout writeChunk lỗi bất thường: {}", e.toString());
                }
            }
            buf.writeNanos += System.nanoTime() - writeStart;
            buf.flushedMsgs += drained.size();
            buf.sessionWrites += members.size();
        }
    }

    private long[] writeChunk(List<String> members, TextMessage frame) {
        long frameLen = frame.getPayloadLength();
        long sendNanos = 0L;
        long bytes = 0L;
        for (String userId : members) {
            ConcurrentHashMap<String, WebSocketSession> connections =
                    localSessionManagement.getUserConnections(userId);
            if (connections == null || connections.isEmpty()) {
                continue;
            }
            for (WebSocketSession session : connections.values()) {
                if (session == null || !session.isOpen()) {
                    continue;
                }
                try {
                    long t0 = System.nanoTime();
                    session.sendMessage(frame);
                    sendNanos += System.nanoTime() - t0;
                    bytes += frameLen;
                } catch (Exception e) {

                    logger.debug("Group flush failed for session={} ({}); skipped",
                            session.getId(), e.toString());
                }
            }
        }
        return new long[]{ sendNanos, bytes };
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
