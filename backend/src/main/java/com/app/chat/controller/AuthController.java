package com.app.chat.controller;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.*;
import com.app.chat.service.AuthServiceInterface;
import com.app.chat.utils.SecurityUtil;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthServiceInterface authService;
    private final Integer cookieExpiration;

    public AuthController(
            AuthServiceInterface injectedAuthService,
            @Value("${cookie.expiration}") Integer injectedCookieExpiration
    ) {
        this.authService = injectedAuthService;
        this.cookieExpiration = injectedCookieExpiration;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>>
    register(@Valid @RequestBody RegisterRequest req) {
        RegisterResponse res = this.authService.register(req);
        return ResponseEntity
                .status(201)
                .body(new ApiResponse<>("Register successfully", res));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<String>> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletResponse res
    ) {
        TokenPair token = this.authService.login(req);

        Cookie cookie = new Cookie("chat_app", token.getRefreshToken());

        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(this.cookieExpiration);

        res.addCookie(cookie);

        return ResponseEntity
                .status(201)
                .body(new ApiResponse<>(
                        "Login successfully",
                        token.getAccessToken()
                ));

    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<?>> logout(
            @CookieValue(value = "chat_app", required = false)
            String refreshToken,
            HttpServletResponse res
            ) {

        // Thieu cai xu ly chan user khi access token con han su dung bang redis
        // Chung ta se xu ly bang cach luu access token cua user nay vao redis,
        // vi du nhu blacklist:@a3sda3sd@... = ""
        // chung ta ko dung blacklist:{userId} = ""
        // la tai vi neu nhu user muon dang nhap lai, ma trong thoi gian do cai TTL cua blacklist:access_token:{userId} = "" van con thi no se ko dang nhap duoc

        if (refreshToken == null) {
            return ResponseEntity
                    .status(401)
                    .body(new ApiResponse<>(
                            ErrorCode.REFRESH_TOKEN_MISSING.getMessage(),
                            Map.of("errorCode", ErrorCode.REFRESH_TOKEN_MISSING)
                    ));
        }
        Cookie cookie = new Cookie("chat_app", null);

        cookie.setHttpOnly(true);
        cookie.setMaxAge(0);
        cookie.setPath("/");
        res.addCookie(cookie);

        this.authService.logout(SecurityUtil.getCurrentUserId(), refreshToken);

        return ResponseEntity
                .status(201)
                .body(new ApiResponse<>("Logout successfully", null));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> getAccessToken(@CookieValue(value = "chat_app", required = false) String refreshToken,
                                            HttpServletResponse res) {
        if (refreshToken == null) {
            return ResponseEntity
                    .status(401)
                    .body(new ApiResponse<>("Refresh token in cookie is missing",
                            Map.of("errorCode", "REFRESH_TOKEN_MISSING")));
        }
        TokenPair token = this.authService.generateAccessToken(refreshToken);

        Cookie cookie = new Cookie("chat_app", token.getRefreshToken());
        cookie.setHttpOnly(true);
        cookie.setPath("/");
        cookie.setMaxAge(this.cookieExpiration);

        res.addCookie(cookie);

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Access token is generated successfully", token.getAccessToken()));
    }
}
