package com.app.chat.websockethandler;


import com.app.chat.config.InstanceIdentityConfig;
import com.app.chat.dto.ChatMessageResponse;
import com.app.chat.dto.GroupMessageResult;
import com.app.chat.dto.SendDirectMessageRequest;
import com.app.chat.dto.SendGroupMessageRequest;
import com.app.chat.exception.ApplicationException;
import com.app.chat.listener.RedisMessageListener;
import com.app.chat.service.ChatServiceInterface;
import com.app.chat.service.FriendServiceInterface;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(ChatHandler.class);

    private static final String SERVER_CHANNEL_PREFIX = "server:";

    private final String serverId;
    private final StringRedisTemplate redisTemplate;
    private final RedisMessageListenerContainer listenerContainer;
    private final RedisMessageListener redisMessageListener;
    private final ObjectMapper objectMapper; //  co san khi su dung starter-web (trong jackson)
    private final ChatServiceInterface chatService;
    private final LocalSessionManagement localSessionManagement;
    private final WebSocketRedisService webSocketRedisService;
    private final FriendServiceInterface friendService;

    public ChatHandler(
            InstanceIdentityConfig instanceIdentityConfig,
            StringRedisTemplate injectedRedisTemplate,
            RedisMessageListenerContainer injectedListenerContainer,
            RedisMessageListener injectedRedisMessageListener,
            ObjectMapper injectedObjectMapper,
            ChatServiceInterface injectedChatService,
            LocalSessionManagement injectedLocalSessionManagement,
            WebSocketRedisService injectedWebSocketRedisService,
            FriendServiceInterface injectedFriendService
    ) {
        // the injected properties
        this.serverId = instanceIdentityConfig.getServerId();
        this.redisTemplate = injectedRedisTemplate;
        this.listenerContainer = injectedListenerContainer;
        this.redisMessageListener = injectedRedisMessageListener;
        this.objectMapper = injectedObjectMapper;
        this.chatService = injectedChatService;
        this.localSessionManagement = injectedLocalSessionManagement;
        this.webSocketRedisService = injectedWebSocketRedisService;
        this.friendService = injectedFriendService;
    }

    @PostConstruct
    public void subscribeToServerChannel() {
        ChannelTopic topic = new ChannelTopic(SERVER_CHANNEL_PREFIX + serverId);
        listenerContainer.addMessageListener(redisMessageListener, topic);
        logger.info("Subscribed to Redis server channel: {}{}", SERVER_CHANNEL_PREFIX, serverId);
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        String userId = (String) session.getAttributes().get("userId");
        String deviceId = (String) session.getAttributes().get("deviceId");

        ConcurrentHashMap<String, WebSocketSession> deviceSessions = localSessionManagement.getDeviceSessions(userId);

        // Cai nay de xoa cai old session
        if (deviceSessions != null) {
            WebSocketSession existingSession = deviceSessions.get(deviceId);
            if (existingSession != null && existingSession.isOpen() && !existingSession.getId().equals(session.getId())) {
                try {
                    existingSession.close(CloseStatus.NORMAL);
                } catch (IOException e) {
                    logger.warn("Failed to close previous WebSocket for userId={}, deviceId={}", userId, deviceId, e);
                }
            }
        }

        // Boc session bang ConcurrentWebSocketSessionDecorator de SERIALIZE moi lan sendMessage tren cung mot session.
        // Tomcat RemoteEndpoint KHONG cho phep 2 luong gui dong thoi -> neu khong boc se gap loi
        // IllegalStateException: remote endpoint in state [TEXT_PARTIAL_WRITING] khi nhieu luong Redis listener
        // (Container-*) cung day message toi cung mot user luc throughput cao (vd: fan-out group chat).
        // sendTimeLimit=10s, bufferSizeLimit=512KB: client cham/nghen se bi dong session thay vi keo sap server.
        WebSocketSession concurrentSession = new ConcurrentWebSocketSessionDecorator(session, 10_000, 512 * 1024);

        boolean firstDeviceOfUserToConnect = this.localSessionManagement.register(userId, deviceId, concurrentSession);
        // cai nay la de SUBSCRIBE vao redis pub sub channel lan dau tien
        if (firstDeviceOfUserToConnect) {
            this.webSocketRedisService.markOnline(userId);
            broadcastPresence(userId, "ONLINE");
        }

        try {
            Map<Long, Integer> counts = this.chatService.getUnreadCounts(Long.parseLong(userId));
            String snapshot = objectMapper.writeValueAsString(Map.of(
                    "type", "UNREAD_SNAPSHOT",
                    "counts", counts
            ));
            // Fix 3 (broken pipe): gui snapshot qua publishToUser() thay vi session.sendMessage() thang.
            // publishToUser -> Redis -> pushMessageToLocalWebSocketSession da co san check isOpen() (line ~297)
            // va xu ly IOException tung device -> mot duong gui duy nhat, mot cho guard duy nhat (gom luon Fix 1/Fix 2),
            // dong thoi day dung toi moi device online cua user (multi-device) thay vi chi session vua connect.
            // register (line ~95) + markOnline (line ~98) da chay TRUOC nen findServersForUser da thay user.
            publishToUser(userId, snapshot);
        } catch (Exception e) {
            // Loi that: query DB, serialize JSON... (broken pipe da duoc pushMessageToLocalWebSocketSession nuot ben trong)
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
        String deviceId = session.getAttributes().get("deviceId").toString();

        boolean fullyOffline = this.localSessionManagement.unregister(userId, deviceId, session);
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
            publishToUser(String.valueOf(request.getReceiverId()), outboundPayload); // Cái này là để gửi tới receiver
            publishToUser(senderId, outboundPayload); // Cái này là để gửi tới chính sender, để check xem tin nhắn có thực sự được gửi không
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
            // Cho nay luu vao database, co kha nang gay nghen vi write DB take time
            // Co the dung message queue thay the 
            GroupMessageResult result = this.chatService.sendGroupMessage(
                    Long.parseLong(senderId),
                    request
            );
            String outboundPayload = this.objectMapper.writeValueAsString(result.getMessage());
            for (String memberId : result.getMemberIds()) {
                publishToUser(memberId, outboundPayload);
            }
        } catch (Exception e) {
            logger.error("Failed to send group message from senderId: {}", senderId, e);
        }
    }

    private void validateFieldMessageTypeAndFieldContentForPrivateMessage(SendDirectMessageRequest request, JsonNode node) {
        // Code truoc khi sua: String messageType = node.has("messageType") ? node.get("messageType").asText("TEXT") : "TEXT";
        String messageType = node.path("messageType").asText("TEXT");
        request.setMessageType(messageType);
        // Code truoc khi sua
//      if (!node.has("content") || node.get("content").isNull() || node.get("content").asText().isBlank()) {
//          throw new IllegalArgumentException(messageType + " message requires content");
//      }

        String content = node.path("content").asText("");

        if (content.isBlank()) {
            throw new IllegalArgumentException(messageType + " message requires content");
        }

        request.setContent(content);
    }

    private void validateFieldMessageTypeAndFieldContentForGroupMessage(SendGroupMessageRequest request, JsonNode node) {
        // Code truoc khi sua: String messageType = node.has("messageType") ? node.get("messageType").asText("TEXT") : "TEXT";
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
        Set<String> targetServers = webSocketRedisService.findServersForUser(userId);
        if (targetServers == null || targetServers.isEmpty()) {
            return;
        }

        try {
            String wrappedPayload = objectMapper.writeValueAsString(Map.of(
                    "targetUserId", userId,
                    "message", messagePayload
            ));

            for (String targetServer : targetServers) {
                redisTemplate.convertAndSend(SERVER_CHANNEL_PREFIX + targetServer, wrappedPayload);
            }
        } catch (Exception e) {
            logger.error("Failed to publish message to userId={}", userId, e);
        }
    }

    public void pushMessageToLocalWebSocketSession(String userId, String payload) {
        ConcurrentHashMap<String, WebSocketSession> deviceSessions = localSessionManagement.getDeviceSessions(userId);
        if (deviceSessions == null || deviceSessions.isEmpty()) {
            logger.warn("This userId: {}does not have any device online, so receiver will not receive message", userId);
            return;
        }

        for (Map.Entry<String, WebSocketSession> entry : deviceSessions.entrySet()) {
            WebSocketSession session = entry.getValue();
            if (session == null || !session.isOpen()) {
                logger.warn("The websocket session of the deviceId {} and userId {} is null or closed", entry.getKey(), userId);
                continue;
            }

            try {
                // khi co 2 message cung luc write trong 1 session thi se bi loi 
                // Can su dung ConcurrentWebSocketSessionDecorator
                //  java.lang.IllegalStateException: 
                // The remote endpoint was in state [TEXT_PARTIAL_WRITING]
                //  which is an invalid state for called method
                session.sendMessage(new TextMessage(payload));
            } catch (IOException e) {
                logger.error(
                        "Failed to send message to userId={}, deviceId={}",
                        userId,
                        entry.getKey(),
                        e
                );
            }
        }
    }
}
