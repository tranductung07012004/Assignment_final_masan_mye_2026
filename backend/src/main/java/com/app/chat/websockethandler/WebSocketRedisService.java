package com.app.chat.websockethandler;

import com.app.chat.config.InstanceIdentityConfig;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
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

    public Set<String> filterOnline(Collection<String> userIds) {
        if (userIds == null || userIds.isEmpty()) return Set.of();

        List<String> idList = new ArrayList<>(userIds);
        List<Object> results = redisTemplate.executePipelined((RedisCallback<Object>) connection -> {
            for (String userId : idList) {
                byte[] key = presenceKey(userId).getBytes(StandardCharsets.UTF_8);
                connection.keyCommands().exists(key);
            }
            // Bat buoc phai tra null trong ham executePipelined(), nhung gia tri tra ve cua ham lambda nay khong duoc su dung, 
            // the nen tra ve null giong nhu la mot cai hinh thuc bat buoc thoi chu khong anh huong den ket qua
            return null;
        });

        Set<String> online = new HashSet<>();
        for (int i = 0; i < idList.size(); i++) {
            Object result = results.get(i);
            System.out.println("result: " + result);
            if (Boolean.TRUE.equals(result)) {
                online.add(idList.get(i));
            }
        }
        return online;
    }

    private static String presenceKey(String userId) {
        return PRESENCE_KEY_PREFIX + userId;
    }
}
