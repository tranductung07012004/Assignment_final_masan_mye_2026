package com.app.chat.service;

import com.app.chat.dto.LoginRequest;
import com.app.chat.dto.TokenPair;
import com.app.chat.dto.RegisterRequest;
import com.app.chat.dto.RegisterResponse;

public interface AuthServiceInterface {
    RegisterResponse register(RegisterRequest req);

    TokenPair login(LoginRequest req);

    void logout(Long userId, String refreshToken, String deviceId);

    TokenPair generateAccessToken(String refreshToken, String deviceId);
}
