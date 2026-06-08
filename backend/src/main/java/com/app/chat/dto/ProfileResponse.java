package com.app.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Builder
public class ProfileResponse {
    private String email;
    private String fullName;
    private String avatarUrl;
    private OffsetDateTime createdAt;
}
