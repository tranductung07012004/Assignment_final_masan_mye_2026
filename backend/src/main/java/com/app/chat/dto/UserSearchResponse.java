package com.app.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;

@Data
@Builder
public class UserSearchResponse {
    private Long id;
    private String fullName;
    private String avatarUrl;
    private String friendRequestStatus;
    private Long friendRequestSenderId;
    private OffsetDateTime cooldownAt;
}
