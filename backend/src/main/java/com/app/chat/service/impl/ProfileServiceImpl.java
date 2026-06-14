package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.ProfileResponse;
import com.app.chat.dto.UpdateProfileRequest;
import com.app.chat.dto.UpdateProfileResponse;
import com.app.chat.entity.User;
import com.app.chat.exception.ApplicationException;
import com.app.chat.repository.UserRepository;
import com.app.chat.service.ProfileServiceInterface;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.OffsetDateTime;
import java.util.Objects;

@Service
public class ProfileServiceImpl implements ProfileServiceInterface {
    private final UserRepository userRepository;
    private final PasswordEncoder encoder;

    public ProfileServiceImpl(
            UserRepository injectedUserRepository,
            PasswordEncoder injectedEncoder
    ) {
        this.userRepository = injectedUserRepository;
        this.encoder = injectedEncoder;
    }

    @Override
    public ProfileResponse getProfile(Long userId) {
        User user = this.userRepository.findUserById(userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));


        return ProfileResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Override
    public UpdateProfileResponse updateProfile(Long userId, UpdateProfileRequest req) {
        User existingUser = this.userRepository.findUserById(userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        if (!Objects.equals(req.getNewPassword(), req.getConfirmNewPassword())) {
            throw new ApplicationException(ErrorCode.PASSWORD_CONFIRMATION_MISMATCH);
        }

        if (!existingUser.getEmail().equals(req.getEmail())) {
            this.userRepository.findByEmail(req.getEmail()).ifPresent(user -> {
                throw new ApplicationException(ErrorCode.EMAIL_ALREADY_REGISTERED);
            });
        }

        String hashPassword = existingUser.getHashPassword();
        if (req.getNewPassword() != null && !req.getNewPassword().isBlank()) {
            if (req.getOldPassword() == null || req.getOldPassword().isBlank()) {
                throw new ApplicationException(ErrorCode.OLD_PASSWORD_REQUIRED);
            }
            if (!this.encoder.matches(req.getOldPassword(), existingUser.getHashPassword())) {
                throw new ApplicationException(ErrorCode.OLD_PASSWORD_NOT_CORRECT);
            }
            hashPassword = this.encoder.encode(req.getNewPassword());
        }

        User updatedUser = User.builder()
                .id(existingUser.getId())
                .email(req.getEmail())
                .fullName(req.getFullName())
                .hashPassword(hashPassword)
                .avatarUrl(req.getAvatarUrl())
                .createdAt(existingUser.getCreatedAt())
                .updatedAt(OffsetDateTime.now())
                .build();

        User savedUser = this.userRepository.save(updatedUser);

        return UpdateProfileResponse.builder()
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .fullName(savedUser.getFullName())
                .avatarUrl(savedUser.getAvatarUrl())
                .build();
    }
}
