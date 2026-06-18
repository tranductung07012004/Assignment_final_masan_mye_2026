package com.app.chat.config;

import com.app.chat.dto.UserSummaryDto;
import com.fasterxml.jackson.databind.JavaType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Configuration
public class RedisConfig {

    @Bean
    public RedisMessageListenerContainer listenerContainer(
            RedisConnectionFactory injectedConnectionFactory
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(injectedConnectionFactory);
        return container;
    }

    // Fix 4: cache hot path gửi tin.
    //
    // KHÔNG dùng GenericJackson2JsonRedisSerializer: nó bật default-typing nên với List/Long sẽ GHI plain JSON
    // (vd ["8","9",...]) nhưng ĐỌC lại đòi type-wrapper [typeId, value] → ném "Could not resolve type id '8'".
    // Thay vào đó mỗi cache có serializer TYPED cố định (đối xứng ghi/đọc, không cần type info trong payload).
    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        ObjectMapper mapper = new ObjectMapper();

        JavaType stringListType = mapper.getTypeFactory().constructCollectionType(List.class, String.class);
        Jackson2JsonRedisSerializer<Object> memberListSerializer =
                new Jackson2JsonRedisSerializer<>(mapper, stringListType);
        Jackson2JsonRedisSerializer<Object> longSerializer =
                new Jackson2JsonRedisSerializer<>(mapper, mapper.getTypeFactory().constructType(Long.class));
        Jackson2JsonRedisSerializer<Object> userSerializer =
                new Jackson2JsonRedisSerializer<>(mapper, mapper.getTypeFactory().constructType(UserSummaryDto.class));

        // base: TTL set riêng từng cache bên dưới; disableCachingNullValues khớp spring.cache.redis.cache-null-values=false.
        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
                .disableCachingNullValues();

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(base.entryTtl(Duration.ofMinutes(10)))
                .withInitialCacheConfigurations(Map.of(
                        "group-members", base.entryTtl(Duration.ofMinutes(10))
                                .serializeValuesWith(SerializationPair.fromSerializer(memberListSerializer)),
                        "private-chat", base.entryTtl(Duration.ofHours(1))
                                .serializeValuesWith(SerializationPair.fromSerializer(longSerializer)),
                        "user", base.entryTtl(Duration.ofMinutes(10))
                                .serializeValuesWith(SerializationPair.fromSerializer(userSerializer))
                ))
                .build();
    }
}
