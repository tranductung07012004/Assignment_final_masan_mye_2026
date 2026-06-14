package com.app.chat.controller;

import com.app.chat.dto.ApiResponse;
import com.app.chat.dto.ProfileResponse;
import com.app.chat.dto.UpdateProfileRequest;
import com.app.chat.dto.UpdateProfileResponse;
import com.app.chat.service.ProfileServiceInterface;
import com.app.chat.utils.SecurityUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {
    private final ProfileServiceInterface profileService;

    public ProfileController(ProfileServiceInterface injectedProfileService) {
        this.profileService = injectedProfileService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<ProfileResponse>> getProfile() {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        ProfileResponse res = this.profileService.getProfile(currentUserId);

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Profile retrieved successfully", res));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<UpdateProfileResponse>> updateProfile(
            @Valid @RequestBody UpdateProfileRequest req
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        UpdateProfileResponse res = this.profileService.updateProfile(currentUserId, req);

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Profile updated successfully", res));
    }
}
