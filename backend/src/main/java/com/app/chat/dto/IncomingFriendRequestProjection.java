package com.app.chat.dto;

import java.time.OffsetDateTime;

public interface IncomingFriendRequestProjection {
    Long getId();

    Long getSenderId();

    String getFullName();

    String getAvatarUrl();

    OffsetDateTime getSentAt();
}
