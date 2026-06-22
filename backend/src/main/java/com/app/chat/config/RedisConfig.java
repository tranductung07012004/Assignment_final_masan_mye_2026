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
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
public class RedisConfig {

    @Bean
    public RedisMessageListenerContainer listenerContainer(
            RedisConnectionFactory injectedConnectionFactory
    ) {
        ThreadPoolTaskExecutor exec = new ThreadPoolTaskExecutor();
        exec.setCorePoolSize(32);
        exec.setMaxPoolSize(256);
        exec.setQueueCapacity(20_000);
        exec.setThreadNamePrefix("redis-listener-");
        exec.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        exec.initialize();

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(injectedConnectionFactory);
        container.setTaskExecutor(exec);
        container.setSubscriptionExecutor(exec);
        return container;
    }

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
