package com.app.chat.websockethandler;

import com.app.chat.config.InstanceIdentityConfig;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.concurrent.TimeUnit;

@Component
public class WebSocketRedisService {

    private static final String PRESENCE_KEY_PREFIX = "chat:";
    private static final long PRESENCE_TTL_SECONDS = 90;

    private final String serverId;
    private final StringRedisTemplate redisTemplate;

    public WebSocketRedisService(InstanceIdentityConfig instanceIdentityConfig, StringRedisTemplate redisTemplate) {
        this.serverId = instanceIdentityConfig.getServerId();
        this.redisTemplate = redisTemplate;
    }

    public void markOnline(String userId) {
        String key = presenceKey(userId);
        redisTemplate.opsForSet().add(key, serverId);
        redisTemplate.expire(key, PRESENCE_TTL_SECONDS, TimeUnit.SECONDS);
    }

    public void markOffline(String userId) {
        redisTemplate.opsForSet().remove(presenceKey(userId), serverId);
    }

    public void refreshTtlForUsers(Set<String> userIds) {
        if (userIds.isEmpty()) {
            return;
        }

        redisTemplate.executePipelined((RedisCallback<Object>) connection -> {
            for (String userId : userIds) {
                byte[] key = presenceKey(userId).getBytes(StandardCharsets.UTF_8);
                connection.keyCommands().expire(key, PRESENCE_TTL_SECONDS);
            }
            return null;
        });
    }

    public Set<String> findServersForUser(String userId) {
        return redisTemplate.opsForSet().members(presenceKey(userId));
    }

    private static String presenceKey(String userId) {
        return PRESENCE_KEY_PREFIX + userId;
    }
}
