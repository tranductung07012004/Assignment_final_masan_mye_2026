package com.app.chat.listener;

import com.app.chat.websockethandler.ChatHandler;
import com.app.chat.websockethandler.GroupBroadcaster;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
public class RedisMessageListener implements MessageListener {

    private static final Logger logger = LoggerFactory.getLogger(RedisMessageListener.class);
    private static final String SERVER_CHANNEL_PREFIX = "server:";
    private static final String BROADCAST_CHANNEL = "group-broadcast";

    private final ChatHandler chatHandler;
    private final GroupBroadcaster groupBroadcaster;
    private final ObjectMapper objectMapper;

    public RedisMessageListener(@Lazy ChatHandler chatHandler,
                                GroupBroadcaster groupBroadcaster,
                                ObjectMapper objectMapper) {
        this.chatHandler = chatHandler;
        this.groupBroadcaster = groupBroadcaster;
        this.objectMapper = objectMapper;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        // server:{id} = targeted (direct/presence); group-broadcast = group fan-out (Fix 1).
        // Both carry the same { targetUserIds, message } shape and route through the same
        // local delivery below, so only the channel gate needs to know about both.
        if (!channel.startsWith(SERVER_CHANNEL_PREFIX) && !channel.equals(BROADCAST_CHANNEL)) {
            logger.warn("Ignoring message on unexpected channel: {}", channel);
            return;
        }

        try {
            String wrappedJson = new String(message.getBody(), StandardCharsets.UTF_8);
            JsonNode node = objectMapper.readTree(wrappedJson);
            String actualPayload = node.get("message").asText();
            JsonNode targetUserIds = node.get("targetUserIds");
            if (targetUserIds == null || !targetUserIds.isArray()) {
                return;
            }

            if (channel.equals(BROADCAST_CHANNEL)) {
                // Group fan-out (Phase 1): KHÔNG loop N member để enqueue per-session. Nối nguyên
                // member list + payload vào buffer của group (O(1)); GroupBroadcaster dựng frame
                // 1 lần/group/cửa sổ rồi ghi cùng buffer tới mọi session local (build-once).
                long groupId = node.get("groupId").asLong();
                List<String> ids = new ArrayList<>(targetUserIds.size());
                for (JsonNode id : targetUserIds) {
                    ids.add(id.asText());
                }
                groupBroadcaster.append(groupId, ids, actualPayload);
            } else {
                // server:{id} = direct / presence / cross-group: vẫn đi qua coalescer per-session.
                for (JsonNode id : targetUserIds) {
                    chatHandler.pushMessageToLocalWebSocketSession(id.asText(), actualPayload);
                }
            }
        } catch (Exception e) {
            logger.error("Failed to process Redis message on channel: {}", channel, e);
        }
    }
}
