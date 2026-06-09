package com.app.chat.config;

import com.app.chat.interceptor.JwtInterceptor;
import com.app.chat.websockethandler.ChatHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final ChatHandler chatHandler;
    private final JwtInterceptor jwtInterceptor;

    public WebSocketConfig(
            ChatHandler injectedChatHandler,
            JwtInterceptor injectedJwtInterceptor
            ) {
        this.chatHandler = injectedChatHandler;
        this.jwtInterceptor = injectedJwtInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(this.chatHandler, "/ws")
                .addInterceptors(this.jwtInterceptor)
                .setAllowedOriginPatterns(
                        "http://localhost:*",
                        "http://127.0.0.1:*"
                );
    }
}
