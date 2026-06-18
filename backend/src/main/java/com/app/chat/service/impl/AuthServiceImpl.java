package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.LoginRequest;
import com.app.chat.dto.TokenPair;
import com.app.chat.dto.RegisterRequest;
import com.app.chat.dto.RegisterResponse;
import com.app.chat.entity.RefreshToken;
import com.app.chat.entity.User;
import com.app.chat.exception.ApplicationException;
import com.app.chat.repository.RefreshTokenRepository;
import com.app.chat.repository.UserRepository;
import com.app.chat.service.AuthServiceInterface;
import com.app.chat.utils.HashUtil;
import com.app.chat.utils.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class AuthServiceImpl implements AuthServiceInterface {
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;

    public AuthServiceImpl(
        UserRepository injectedUserRepository,
        RefreshTokenRepository injectedRefreshTokenRepository,
        PasswordEncoder injectedEncoder,
        JwtUtil injectedJwtUtil
    ) {
        this.userRepository = injectedUserRepository;
        this.refreshTokenRepository = injectedRefreshTokenRepository;
        this.encoder = injectedEncoder;
        this.jwtUtil = injectedJwtUtil;
    }

    @Override
    @Transactional
    public TokenPair login(LoginRequest req) {
        User user = this.userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        if (!encoder.matches(req.getPassword(), user.getHashPassword())) {
            throw new ApplicationException(ErrorCode.PASSWORD_NOT_CORRECT);
        }

        String accessToken = this.jwtUtil.generateAccessToken(user.getId().toString());
        String refreshToken = this.jwtUtil.generateRefreshToken(user.getId().toString());

        String hashToken = HashUtil.hashSHA256(refreshToken);
        OffsetDateTime now = OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS);

        int updated = this.refreshTokenRepository.updateByUserIdAndDeviceId(
                user.getId(),
                req.getDeviceId(),
                hashToken,
                now
        );

        if (updated == 0) {
            RefreshToken obj = RefreshToken.builder()
                    .userId(user.getId())
                    .deviceId(req.getDeviceId())
                    .hashToken(hashToken)
                    .build();
            this.refreshTokenRepository.save(obj);
        }

        return new TokenPair(
                accessToken,
                refreshToken
        );
    }

    @Override
    public RegisterResponse register(RegisterRequest req) {
        Optional<User> user = this.userRepository.findByEmail(req.getEmail());
        if (user.isPresent()) {
            throw new ApplicationException(ErrorCode.EMAIL_ALREADY_REGISTERED);
        }

        User newUser = User.builder()
                .email(req.getEmail())
                .fullName(req.getFullName())
                .hashPassword(this.encoder.encode(req.getPassword()))
                .avatarUrl(null)
                .build();
        User savedUser = this.userRepository.save(newUser);

        return RegisterResponse.builder()
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .build();
    }

    @Override
    @Transactional
    public void logout(Long userId, String refreshToken, String deviceId) {
        String hashRefreshToken = HashUtil.hashSHA256(refreshToken);
        RefreshToken storedToken = this.refreshTokenRepository
                .findByHashToken(hashRefreshToken).orElseThrow(
                        () -> new ApplicationException(ErrorCode.REFRESH_TOKEN_DOES_NOT_EXISTS_IN_DB)
                );

        if (!storedToken.getUserId().equals(userId)) {
            throw new ApplicationException(ErrorCode.REFRESH_TOKEN_DOES_NOT_EXISTS_IN_DB);
        }

        if (!storedToken.getDeviceId().equals(deviceId)) {
            throw new ApplicationException(ErrorCode.DEVICE_ID_MISMATCH);
        }

        this.refreshTokenRepository.deleteByHashToken(hashRefreshToken);
    }

    @Override
    @Transactional
    public TokenPair generateAccessToken(String refreshTokenInCookie, String deviceId) {
        if (!jwtUtil.validateToken(refreshTokenInCookie)) {
            throw new ApplicationException(ErrorCode.INVALID_TOKEN);
        }

        String hashInputRefreshTokenInCookie = HashUtil.hashSHA256(refreshTokenInCookie);

        RefreshToken oldToken = this.refreshTokenRepository
                .findByHashToken(hashInputRefreshTokenInCookie)
                .orElseThrow(() -> new ApplicationException(ErrorCode.REFRESH_TOKEN_DOES_NOT_EXISTS_IN_DB));

        if (!oldToken.getDeviceId().equals(deviceId)) {
            throw new ApplicationException(ErrorCode.DEVICE_ID_MISMATCH);
        }

        User userObj = this.userRepository.findById(oldToken.getUserId())
                .orElseThrow(() -> new
                        ApplicationException(
                        ErrorCode.USER_NOT_FOUND,
                        "User not found with id: " +
                                oldToken.getUserId()
                ));

        this.refreshTokenRepository.deleteByHashToken(hashInputRefreshTokenInCookie);

        String newRefreshTokenString = this.jwtUtil.generateRefreshToken(oldToken.getUserId().toString());

        RefreshToken newRefreshTokenObject = RefreshToken.builder()
                .userId(oldToken.getUserId())
                .deviceId(oldToken.getDeviceId())
                .hashToken(HashUtil.hashSHA256(newRefreshTokenString))
                .build();

        this.refreshTokenRepository.save(newRefreshTokenObject);

        String accessToken = this.jwtUtil.generateAccessToken(userObj.getId().toString());

        return new TokenPair(accessToken, newRefreshTokenString);
    }
}
