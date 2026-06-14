package com.app.chat.dto;

import java.time.Instant;

public interface FriendProjection {
    Long getId();
    String getFullName();
    String getAvatarUrl();
    Instant getCreatedAt();
}
