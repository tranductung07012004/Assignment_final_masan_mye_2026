package com.app.chat.interceptor;

import com.app.chat.utils.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
public class JwtInterceptor implements HandshakeInterceptor {
    private final JwtUtil jwtUtil;

    public JwtInterceptor(
            JwtUtil injectedJwtInterceptor
    ) {
        this.jwtUtil = injectedJwtInterceptor;
    }

    @Override
    public boolean beforeHandshake(
            ServerHttpRequest req,
            @NonNull ServerHttpResponse res,
            @NonNull WebSocketHandler wsHandler,
            @NonNull Map<String, Object> attributes) {
        String query = req.getURI().getQuery();

        if (query == null || !query.startsWith("token=")) {
            // Chỉ set statusCode chỗ này vì trong websocket connect từ frontend thì status code là thứ duy nhất có ý nghĩa
            // khác với HeaderAuthenticationFilter có body trong response vì nó là http method.
            res.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
        String token = query.substring("token=".length());
        if (!jwtUtil.validateToken(token)) {
            res.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
        // Đặt userId vào session attributes để handler dùng sau
        String userId = jwtUtil.extractUserId(token);
        attributes.put("userId", userId);
        return true;
    }

    @Override
    public void afterHandshake(
            @NonNull ServerHttpRequest request,
            @NonNull ServerHttpResponse response,
            @NonNull WebSocketHandler wsHandler,
            @Nullable Exception exception) {
    }

}
