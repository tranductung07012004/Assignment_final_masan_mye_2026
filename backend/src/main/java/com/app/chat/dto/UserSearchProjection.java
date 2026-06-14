package com.app.chat.dto;

import java.time.OffsetDateTime;

public interface UserSearchProjection {
    Long getId();

    String getFullName();

    String getAvatarUrl();

    String getFriendRequestStatus();

    Long getFriendRequestSenderId();

    OffsetDateTime getCooldownAt();
}
