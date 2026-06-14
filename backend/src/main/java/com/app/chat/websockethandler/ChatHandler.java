package com.app.chat.websockethandler;


import com.app.chat.config.InstanceIdentityConfig;
import com.app.chat.dto.ChatMessageResponse;
import com.app.chat.dto.GroupMessageResult;
import com.app.chat.dto.SendDirectMessageRequest;
import com.app.chat.dto.SendGroupMessageRequest;
import com.app.chat.exception.ApplicationException;
import com.app.chat.listener.RedisMessageListener;
import com.app.chat.service.ChatServiceInterface;
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
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
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

    public ChatHandler(
            InstanceIdentityConfig instanceIdentityConfig,
            StringRedisTemplate injectedRedisTemplate,
            RedisMessageListenerContainer injectedListenerContainer,
            RedisMessageListener injectedRedisMessageListener,
            ObjectMapper injectedObjectMapper,
            ChatServiceInterface injectedChatService,
            LocalSessionManagement injectedLocalSessionManagement,
            WebSocketRedisService injectedWebSocketRedisService
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

        boolean firstDeviceOfUserToConnect = localSessionManagement.register(userId, deviceId, session);
        // cai nay la de SUBSCRIBE vao redis pub sub channel lan dau tien
        if (firstDeviceOfUserToConnect) {
            webSocketRedisService.markOnline(userId);
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

        boolean fullyOffline = localSessionManagement.unregister(userId, deviceId, session);
        if (fullyOffline) {
            webSocketRedisService.markOffline(userId);
        }
    }

    private void handleDirectMessage(WebSocketSession session, JsonNode node) {
        String senderId = (String) session.getAttributes().get("userId");

        if (!node.has("content") || node.get("content").isNull()) {
            logger.warn("Direct message missing content from senderId: {}", senderId);
            return;
        }

        SendDirectMessageRequest request = new SendDirectMessageRequest();
        request.setReceiverId(node.get("receiverId").asLong());
        request.setContent(node.get("content").asText());

        try {
            ChatMessageResponse savedMessage = this.chatService.sendDirectMessage(
                    Long.parseLong(senderId),
                    request
            );
            String outboundPayload = this.objectMapper.writeValueAsString(savedMessage);
            publishToUser(String.valueOf(request.getReceiverId()), outboundPayload);
            publishToUser(senderId, outboundPayload);
        } catch (ApplicationException e) {
            logger.warn("Failed to send direct message from senderId {}: {}", senderId, e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to send direct message from senderId: {}", senderId, e);
        }
    }

    private void handleGroupMessage(WebSocketSession session, JsonNode node) {
        String senderId = (String) session.getAttributes().get("userId");

        if (!node.has("content") || node.get("content").isNull()) {
            logger.warn("Group message missing content from senderId: {}", senderId);
            return;
        }

        SendGroupMessageRequest request = new SendGroupMessageRequest();
        request.setGroupId(node.get("groupId").asLong());
        request.setContent(node.get("content").asText());

        try {
            // Cho nay luu vao database, co kha nang gay nghen vi write DB take time
            // Co the dung message queue thay the 
            GroupMessageResult result = this.chatService.sendGroupMessage(
                    Long.parseLong(senderId),
                    request
            );
            String outboundPayload = this.objectMapper.writeValueAsString(result.getMessage());
            for (Long memberId : result.getMemberIds()) {
                publishToUser(String.valueOf(memberId), outboundPayload);
            }
        } catch (Exception e) {
            logger.error("Failed to send group message from senderId: {}", senderId, e);
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
