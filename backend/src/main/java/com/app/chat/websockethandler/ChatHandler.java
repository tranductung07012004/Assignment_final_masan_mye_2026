package com.app.chat.websockethandler;


import com.app.chat.config.InstanceIdentityConfig;
import com.app.chat.dto.ChatMessageResponse;
import com.app.chat.dto.GroupMessageResult;
import com.app.chat.dto.SendDirectMessageRequest;
import com.app.chat.dto.SendGroupMessageRequest;
import com.app.chat.exception.ApplicationException;
import com.app.chat.listener.RedisMessageListener;
import com.app.chat.service.ChatService;
import com.app.chat.service.FriendService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(ChatHandler.class);

    private static final String SERVER_CHANNEL_PREFIX = "server:";
    // Fix 1 (Cách A): group fan-out goes through ONE shared channel that every instance
    // subscribes to, carrying the full member-id list — instead of an SMEMBERS-per-member
    // presence lookup. Direct/presence still use the targeted server:{id} channel.
    private static final String BROADCAST_CHANNEL = "group-broadcast";

    private final String serverId;
    private final StringRedisTemplate redisTemplate;
    private final RedisMessageListenerContainer listenerContainer;
    private final RedisMessageListener redisMessageListener;
    private final ObjectMapper objectMapper;
    private final ChatService chatService;
    private final LocalSessionManagement localSessionManagement;
    private final WebSocketRedisService webSocketRedisService;
    private final FriendService friendService;
    private final OutboundCoalescer outboundCoalescer;

    public ChatHandler(
            InstanceIdentityConfig instanceIdentityConfig,
            StringRedisTemplate injectedRedisTemplate,
            RedisMessageListenerContainer injectedListenerContainer,
            RedisMessageListener injectedRedisMessageListener,
            ObjectMapper injectedObjectMapper,
            ChatService injectedChatService,
            LocalSessionManagement injectedLocalSessionManagement,
            WebSocketRedisService injectedWebSocketRedisService,
            FriendService injectedFriendService,
            OutboundCoalescer injectedOutboundCoalescer
    ) {
        this.serverId = instanceIdentityConfig.getServerId();
        this.redisTemplate = injectedRedisTemplate;
        this.listenerContainer = injectedListenerContainer;
        this.redisMessageListener = injectedRedisMessageListener;
        this.objectMapper = injectedObjectMapper;
        this.chatService = injectedChatService;
        this.localSessionManagement = injectedLocalSessionManagement;
        this.webSocketRedisService = injectedWebSocketRedisService;
        this.friendService = injectedFriendService;
        this.outboundCoalescer = injectedOutboundCoalescer;
    }

    @PostConstruct
    public void subscribeToServerChannel() {
        ChannelTopic topic = new ChannelTopic(SERVER_CHANNEL_PREFIX + serverId);
        listenerContainer.addMessageListener(redisMessageListener, topic);
        logger.info("Subscribed to Redis server channel: {}{}", SERVER_CHANNEL_PREFIX, serverId);

        ChannelTopic broadcastTopic = new ChannelTopic(BROADCAST_CHANNEL);
        listenerContainer.addMessageListener(redisMessageListener, broadcastTopic);
        logger.info("Subscribed to Redis broadcast channel: {}", BROADCAST_CHANNEL);
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        String userId = (String) session.getAttributes().get("userId");
        String connectionId = (String) session.getAttributes().get("connectionId");

        ConcurrentHashMap<String, WebSocketSession> connections = localSessionManagement.getUserConnections(userId);

        if (connections != null) {
            // Only closes a stale socket of the SAME tab (same connectionId), e.g. a reconnect
            // after a broken pipe. Other tabs have different connectionIds and are left alone.
            WebSocketSession existingSession = connections.get(connectionId);
            if (existingSession != null && existingSession.isOpen() && !existingSession.getId().equals(session.getId())) {
                try {
                    existingSession.close(CloseStatus.NORMAL);
                } catch (IOException e) {
                    logger.warn("Failed to close previous WebSocket for userId={}, connectionId={}", userId, connectionId, e);
                }
            }
        }

        WebSocketSession concurrentSession = new ConcurrentWebSocketSessionDecorator(session, 10_000, 512 * 1024);

        boolean firstConnectionOfUser = this.localSessionManagement.register(userId, connectionId, concurrentSession);
        if (firstConnectionOfUser) {
            this.webSocketRedisService.markOnline(userId);
            broadcastPresence(userId, "ONLINE");
        }

        try {
            Map<Long, Integer> counts = this.chatService.getUnreadCounts(Long.parseLong(userId));
            String snapshot = objectMapper.writeValueAsString(Map.of(
                    "type", "UNREAD_SNAPSHOT",
                    "counts", counts
            ));
            publishToUser(userId, snapshot);
        } catch (Exception e) {
            logger.error("Failed to build/push UNREAD_SNAPSHOT to userId={}", userId, e);
        }
    }

    @Override
    protected void handleTextMessage(
            @NonNull WebSocketSession session,
            @NonNull TextMessage message
    ) {
        String payload = message.getPayload();

        try {
            JsonNode node = this.objectMapper.readTree(payload);

            if (node.has("type")) {
                String type = node.get("type").asText();
                if ("MARK_READ".equals(type)) {
                    handleMarkRead(session, node);
                    return;
                }
                if ("PRESENCE_QUERY".equals(type)) {
                    handlePresenceQuery(session, node);
                    return;
                }
            }

            if (node.has("receiverId")) {
                handleDirectMessage(session, node);
                return;
            }

            if (node.has("groupId")) {
                handleGroupMessage(session, node);
                return;
            }

            logger.warn("WebSocket message missing receiverId/groupId: {}", payload);
        } catch (Exception e) {
            logger.error("Failed to route WebSocket message: {}", payload, e);
        }
    }

    @Override
    public void afterConnectionClosed(@NonNull WebSocketSession session, @NonNull CloseStatus status) {
        String userId = session.getAttributes().get("userId").toString();
        String connectionId = session.getAttributes().get("connectionId").toString();

        boolean fullyOffline = this.localSessionManagement.unregister(userId, connectionId, session);
        if (fullyOffline) {
            this.webSocketRedisService.markOffline(userId);
            broadcastPresence(userId, "OFFLINE");
        }
    }

    private void handleDirectMessage(WebSocketSession session, JsonNode node) {
        String senderId = (String) session.getAttributes().get("userId");

        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setReceiverId(node.get("receiverId").asLong());

        try {
            validateFieldMessageTypeAndFieldContentForPrivateMessage(request, node);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid direct message from senderId {}: {}", senderId, e.getMessage());
            return;
        }

        try {
            ChatMessageResponse savedMessage = this.chatService.sendDirectMessage(
                    Long.parseLong(senderId),
                    request
            );
            String outboundPayload = this.objectMapper.writeValueAsString(savedMessage);
            publishToUsers(List.of(String.valueOf(request.getReceiverId()), senderId), outboundPayload);
        } catch (Exception e) {
            logger.error("Failed to send direct message from senderId: {}", senderId, e);
        }
    }

    private void handleGroupMessage(WebSocketSession session, JsonNode node) {
        String senderId = (String) session.getAttributes().get("userId");

        SendGroupMessageRequest request = new SendGroupMessageRequest();
        request.setGroupId(node.get("groupId").asLong());

        try {
            validateFieldMessageTypeAndFieldContentForGroupMessage(request, node);
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid group message from senderId {}: {}", senderId, e.getMessage());
            return;
        }

        try {
            GroupMessageResult result = this.chatService.sendGroupMessage(
                    Long.parseLong(senderId),
                    request
            );
            String outboundPayload = this.objectMapper.writeValueAsString(result.getMessage());
            publishGroupMessage(request.getGroupId(), result.getMemberIds(), outboundPayload);
        } catch (Exception e) {
            logger.error("Failed to send group message from senderId: {}", senderId, e);
        }
    }

    private void validateFieldMessageTypeAndFieldContentForPrivateMessage(SendDirectMessageRequest request, JsonNode node) {
        String messageType = node.path("messageType").asText("TEXT");
        request.setMessageType(messageType);

        String content = node.path("content").asText("");

        if (content.isBlank()) {
            throw new IllegalArgumentException(messageType + " message requires content");
        }

        request.setContent(content);
    }

    private void validateFieldMessageTypeAndFieldContentForGroupMessage(SendGroupMessageRequest request, JsonNode node) {
        String messageType = node.path("messageType").asText("TEXT");
        request.setMessageType(messageType);

        String content = node.path("content").asText("");

        if (content.isBlank()) {
            throw new IllegalArgumentException(messageType + " message requires content");
        }

        request.setContent(content);
    }

    private void handleMarkRead(WebSocketSession session, JsonNode node) {
        String userId = (String) session.getAttributes().get("userId");
        if (!node.has("groupId") || !node.has("lastReadMsgId")) {
            logger.warn("MARK_READ from userId={} missing groupId or lastReadMsgId", userId);
            return;
        }

        long groupId = node.get("groupId").asLong();
        long lastReadMsgId = node.get("lastReadMsgId").asLong();

        try {
            this.chatService.markRead(Long.parseLong(userId), groupId, lastReadMsgId);
            String readSync = objectMapper.writeValueAsString(Map.of(
                    "type", "READ_SYNC",
                    "groupId", groupId,
                    "count", 0
            ));
            publishToUser(userId, readSync);
        } catch (Exception e) {
            logger.error("Failed to handle MARK_READ for userId={}, groupId={}", userId, groupId, e);
        }
    }

    private void broadcastPresence(String userId, String status) {
        try {
            List<Long> friendIds = this.friendService.getFriendIds(Long.parseLong(userId));
            if (friendIds.isEmpty()) return;
            String payload = objectMapper.writeValueAsString(Map.of(
                    "type", "PRESENCE",
                    "userId", Long.parseLong(userId),
                    "status", status
            ));
            for (Long friendId : friendIds) {
                this.publishToUser(String.valueOf(friendId), payload);
            }
        } catch (Exception e) {
            logger.error("Failed to broadcast presence for userId={}", userId, e);
        }
    }

    private void handlePresenceQuery(WebSocketSession session, JsonNode node) {
        String self = (String) session.getAttributes().get("userId");
        JsonNode userIdsNode = node.get("userIds");
        if (userIdsNode == null || !userIdsNode.isArray()) return;

        List<String> requestedIds = new ArrayList<>();
        for (JsonNode id : userIdsNode) {
            requestedIds.add(id.asText());
        }

        Set<String> online = this.webSocketRedisService.filterOnline(requestedIds);

        Map<String, Boolean> statuses = new HashMap<>();
        for (String id : requestedIds) {
            statuses.put(id, online.contains(id));
        }

        try {
            String response = objectMapper.writeValueAsString(Map.of(
                    "type", "PRESENCE_SNAPSHOT",
                    "statuses", statuses
            ));
            publishToUser(self, response);
        } catch (Exception e) {
            logger.error("Failed to send PRESENCE_SNAPSHOT to userId={}", self, e);
        }
    }

    private void publishToUser(String userId, String messagePayload) {
        publishToUsers(List.of(userId), messagePayload);
    }

    /**
     * Giao 1 payload tới NHIỀU user một cách hiệu quả:
     *   - Option 4: resolve presence của tất cả user trong MỘT pipeline.
     *   - Option 2: user nối vào CHÍNH server này -> push thẳng vào WS local, KHÔNG qua Redis.
     *   - Option 3: user ở server khác -> gom theo server rồi PUBLISH đúng 1 lần/server
     *               (kèm danh sách userId), thay vì 1 publish / user.
     */
    private void publishToUsers(Collection<String> userIds, String messagePayload) {
        if (userIds == null || userIds.isEmpty()) {
            return;
        }

        Set<String> distinctUserIds = new LinkedHashSet<>(userIds);
        Map<String, Set<String>> serversByUser = webSocketRedisService.findServersForUsers(distinctUserIds);

        Map<String, List<String>> usersByRemoteServer = new HashMap<>();
        for (String userId : distinctUserIds) {
            Set<String> servers = serversByUser.get(userId);
            if (servers == null || servers.isEmpty()) {
                continue; // user offline ở mọi server
            }
            for (String server : servers) {
                if (serverId.equals(server)) {
                    pushMessageToLocalWebSocketSession(userId, messagePayload);
                } else {
                    usersByRemoteServer.computeIfAbsent(server, k -> new ArrayList<>()).add(userId);
                }
            }
        }

        for (Map.Entry<String, List<String>> entry : usersByRemoteServer.entrySet()) {
            try {
                String wrappedPayload = objectMapper.writeValueAsString(Map.of(
                        "targetUserIds", entry.getValue(),
                        "message", messagePayload
                ));
                redisTemplate.convertAndSend(SERVER_CHANNEL_PREFIX + entry.getKey(), wrappedPayload);
            } catch (Exception e) {
                logger.error("Failed to publish message to server={}", entry.getKey(), e);
            }
        }
    }

    /**
     * Fix 1 (Cách A): fan out a group message with EXACTLY ONE Redis PUBLISH, regardless of
     * group size. Every instance is subscribed to {@link #BROADCAST_CHANNEL}; each one receives
     * this payload (carrying all member ids + groupId) and delivers only to the members whose
     * sessions it holds locally — no per-member SMEMBERS presence lookup.
     * <p>
     * Phase 1 (shared-buffer broadcast): the listener no longer loops members to enqueue
     * per-session; it appends to {@link GroupBroadcaster}, which builds the frame ONCE per
     * group/window and writes the same buffer to every local session (build-once, write-to-many).
     */
    private void publishGroupMessage(long groupId, List<String> memberIds, String messagePayload) {
        if (memberIds == null || memberIds.isEmpty()) {
            return;
        }
        try {
            // groupId đi kèm để mỗi instance route payload vào đúng buffer của group trong
            // GroupBroadcaster (shard theo groupId -> giữ thứ tự + build-once/group/cửa sổ).
            String wrappedPayload = objectMapper.writeValueAsString(Map.of(
                    "groupId", groupId,
                    "targetUserIds", memberIds,
                    "message", messagePayload
            ));
            redisTemplate.convertAndSend(BROADCAST_CHANNEL, wrappedPayload);
        } catch (Exception e) {
            logger.error("Failed to publish group message to broadcast channel", e);
        }
    }

    public void pushMessageToLocalWebSocketSession(String userId, String payload) {
        ConcurrentHashMap<String, WebSocketSession> connections = localSessionManagement.getUserConnections(userId);
        if (connections == null || connections.isEmpty()) {
            // DEBUG, không WARN: trong group fan-out, member offline (sẽ đọc lại từ DB/unread khi
            // reconnect) là chuyện BÌNH THƯỜNG. Log này chạy per-recipient/per-message trên đường
            // nóng — để WARN sẽ spam hàng triệu dòng + bóp throughput (logback đồng bộ), và chính
            // việc ghi log đó tranh CPU với flusher -> góp phần gây drop.
            logger.debug("userId {} has no online connection on this instance; skipped (will read from DB later)", userId);
            return;
        }

        for (Map.Entry<String, WebSocketSession> entry : connections.entrySet()) {
            WebSocketSession session = entry.getValue();
            if (session == null || !session.isOpen()) {
                logger.debug("Session for connectionId {} / userId {} is null or closed; skipped", entry.getKey(), userId);
                continue;
            }

            // Gom thay vì gửi thẳng: §3.4 conflation + §3.5 backpressure. enqueue là thao tác
            // queue non-blocking (không throw); việc gửi blocking + bắt SessionLimitExceededException
            // giờ nằm trong flusher của OutboundCoalescer, nên 1 client chậm không chặn fan-out.
            outboundCoalescer.enqueue(session, payload);
        }
    }
}
