package com.app.chat.websockethandler;


import com.app.chat.dto.ChatMessageResponse;
import com.app.chat.dto.GroupMessageResult;
import com.app.chat.dto.SendDirectMessageRequest;
import com.app.chat.dto.SendGroupMessageRequest;
import com.app.chat.exception.ApplicationException;
import com.app.chat.listener.RedisMessageListener;
import com.app.chat.service.ChatServiceInterface;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatHandler extends TextWebSocketHandler {

    private static final Logger logger = LoggerFactory.getLogger(ChatHandler.class);
    public static final String USER_CHANNEL_PREFIX = "user:";

    // Lý do vì sao có 2 cái này notion:
    // https://www.notion.so/Gi-i-th-ch-l-do-cho-s-t-n-t-i-c-a-localSessions-v-userChannels-3792a77150888037b0b8fab8b668c1a4?source=copy_link
    // sessionsByUser thay cho localSessions cũ (userId -> session), giờ là userId -> (deviceId -> session) để support multi-device
    private final ConcurrentHashMap<String, ConcurrentHashMap<String, WebSocketSession>> sessionsByUser;
    private final ConcurrentHashMap<String, ChannelTopic> userChannels;

    private final StringRedisTemplate redisTemplate;
    private final RedisMessageListenerContainer listenerContainer;
    private final RedisMessageListener redisMessageListener;
    private final ObjectMapper objectMapper; // có sẵn khi sử dụng starter-web (trong jackson)
    private final ChatServiceInterface chatService;

    public ChatHandler(
            StringRedisTemplate injectedRedisTemplate,
            RedisMessageListenerContainer injectedListenerContainer,
            RedisMessageListener injectedRedisMessageListener,
            ObjectMapper injectedObjectMapper,
            ChatServiceInterface injectedChatService
    ) {
        // the injected properties
        this.redisTemplate = injectedRedisTemplate;
        this.listenerContainer = injectedListenerContainer;
        this.redisMessageListener = injectedRedisMessageListener;
        this.objectMapper = injectedObjectMapper;
        this.chatService = injectedChatService;

        // the self constructed properties
        this.sessionsByUser = new ConcurrentHashMap<>();
        this.userChannels = new ConcurrentHashMap<>();
    }

    public static String userChannel(String userId) {
        return USER_CHANNEL_PREFIX + userId;
    }

    @Override
    public void afterConnectionEstablished(@NonNull WebSocketSession session) {
        String userId = (String) session.getAttributes().get("userId");
        String deviceId = (String) session.getAttributes().get("deviceId");

        // computeIfAbsent co nghia la neu khong co thi insert cai lambda vao map, neu co roi thi lay value ra dung
        // computeIfAbsent thi thread-safe
        ConcurrentHashMap<String, WebSocketSession> deviceSessions =
                this.sessionsByUser.computeIfAbsent(userId, i -> new ConcurrentHashMap<>());

        boolean firstDeviceOfUserToConnect = deviceSessions.isEmpty();

        // Cai nay de xoa cai old session
        WebSocketSession existingSession = deviceSessions.get(deviceId);
        if (existingSession != null && existingSession.isOpen() && !existingSession.getId().equals(session.getId())) {
            try {
                existingSession.close(CloseStatus.NORMAL);
            } catch (IOException e) {
                logger.warn("Failed to close previous WebSocket for userId={}, deviceId={}", userId, deviceId, e);
            }
        }

        deviceSessions.put(deviceId, session);

        // cai nay la de SUBCRIBE vao redis pub sub channel lan dau tien
        if (firstDeviceOfUserToConnect) {
            ChannelTopic topic = new ChannelTopic(userChannel(userId));
            this.userChannels.put(userId, topic);
            this.listenerContainer.addMessageListener(redisMessageListener, topic);
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

        ConcurrentHashMap<String, WebSocketSession> deviceSessions = this.sessionsByUser.get(userId);
        if (deviceSessions == null) {
            return;
        }

        deviceSessions.remove(deviceId, session);

        // Remove xong ma thay deviceSessions rong,
        // thi co nghia la user nay ngung connect tren moi device
        // remove luon sessionByUser.
        // remove luon userChannels.
        // va remove channel trong redis pubsub
        if (deviceSessions.isEmpty()) {
            this.sessionsByUser.remove(userId, deviceSessions);

            ChannelTopic topic = this.userChannels.remove(userId);
            if (topic != null) {
                this.listenerContainer.removeMessageListener(redisMessageListener, topic);
            }
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
            this.redisTemplate.convertAndSend(userChannel(String.valueOf(request.getReceiverId())), outboundPayload);
            this.redisTemplate.convertAndSend(userChannel(senderId), outboundPayload);
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
            // Chỗ này lưu vào database, có khả năng gây nghẽn vì write DB take time
            // Có thể dùng message queue thay thế
            GroupMessageResult result = this.chatService.sendGroupMessage(
                    Long.parseLong(senderId),
                    request
            );
            String outboundPayload = this.objectMapper.writeValueAsString(result.getMessage());
            for (Long memberId : result.getMemberIds()) {
                this.redisTemplate.convertAndSend(userChannel(String.valueOf(memberId)), outboundPayload);
            }
        } catch (ApplicationException e) {
            logger.warn("Failed to send group message from senderId {}: {}", senderId, e.getMessage());
        } catch (Exception e) {
            logger.error("Failed to send group message from senderId: {}", senderId, e);
        }
    }

    public void pushMessageToLocalWebSocketSession(String userId, String payload) {
        ConcurrentHashMap<String, WebSocketSession> deviceSessions = this.sessionsByUser.get(userId);
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
