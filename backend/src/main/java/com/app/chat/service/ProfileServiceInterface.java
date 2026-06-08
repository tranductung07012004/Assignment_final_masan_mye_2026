package com.app.chat.service;

import com.app.chat.dto.ProfileResponse;
import com.app.chat.dto.UpdateProfileRequest;
import com.app.chat.dto.UpdateProfileResponse;

public interface ProfileServiceInterface {
    ProfileResponse getProfile(Long userId);

    UpdateProfileResponse updateProfile(Long userId, UpdateProfileRequest req);
}
