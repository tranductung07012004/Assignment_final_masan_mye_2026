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
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Component
// Lý do vì sao phải sử dụng HandshakeInceptor mà không xử lý luôn
// ở phần SecurityConfig -> HeaderAuthenticationFilter, coi thêm trong notion:
// https://www.notion.so/T-i-sao-ph-i-s-d-ng-HandshakeInterceptor-c-a-websocket-starter-trong-Spring-37d2a771508880379800dc5d697251d7?source=copy_link
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
        Map<String, String> queryParams = UriComponentsBuilder.fromUri(req.getURI())
                .build()
                .getQueryParams()
                .toSingleValueMap();

        String token = queryParams.get("token");
        String deviceId = queryParams.get("deviceId");

        if (token == null || token.isBlank()) {
            // Chỉ set statusCode chỗ này vì trong websocket connect từ frontend thì status code là thứ duy nhất có ý nghĩa
            // khác với HeaderAuthenticationFilter có body trong response vì nó là http method.
            res.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        if (deviceId == null || deviceId.isBlank()) {
            res.setStatusCode(HttpStatus.BAD_REQUEST);
            return false;
        }

        if (!jwtUtil.validateToken(token)) {
            res.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }

        // Đặt userId vào session attributes để handler dùng sau
        String userId = jwtUtil.extractUserId(token);
        attributes.put("userId", userId);
        attributes.put("deviceId", deviceId);
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
