package com.app.chat.websockethandler;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class UpdateExpireForRedisCacheScheduler {

    private static final long REFRESH_INTERVAL_MS = 30_000;

    private final LocalSessionManagement localSessionManagement;
    private final WebSocketRedisService webSocketRedisService;

    public UpdateExpireForRedisCacheScheduler(
            LocalSessionManagement localSessionManagement,
            WebSocketRedisService webSocketRedisService
    ) {
        this.localSessionManagement = localSessionManagement;
        this.webSocketRedisService = webSocketRedisService;
    }

    @Scheduled(fixedDelay = REFRESH_INTERVAL_MS)
    public void updateExpireForOnlineUsers() {
        webSocketRedisService.refreshTtlForUsers(localSessionManagement.getOnlineUserIds());
    }
}
