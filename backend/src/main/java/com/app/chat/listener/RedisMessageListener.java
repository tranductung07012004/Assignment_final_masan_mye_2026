package com.app.chat.listener;

import com.app.chat.websockethandler.ChatHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;

@Component
public class RedisMessageListener implements MessageListener {

    private static final Logger logger = LoggerFactory.getLogger(RedisMessageListener.class);
    private static final String USER_CHANNEL_PREFIX = "user:";

    private final ChatHandler chatHandler;

    public RedisMessageListener(@Lazy ChatHandler chatHandler) {
        this.chatHandler = chatHandler;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String channel = new String(message.getChannel(), StandardCharsets.UTF_8);
        if (!channel.startsWith(USER_CHANNEL_PREFIX)) {
            logger.warn("Ignoring message on unexpected channel: {}", channel);
            return;
        }

        String userId = channel.substring(USER_CHANNEL_PREFIX.length());
        String payload = new String(message.getBody(), StandardCharsets.UTF_8);
        chatHandler.pushToLocalSession(userId, payload);
    }
}
