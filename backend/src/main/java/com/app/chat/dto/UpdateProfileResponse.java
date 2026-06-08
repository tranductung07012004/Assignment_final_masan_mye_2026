package com.app.chat.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UpdateProfileResponse {
    private Long userId;
    private String email;
    private String fullName;
    private String avatarUrl;
}
