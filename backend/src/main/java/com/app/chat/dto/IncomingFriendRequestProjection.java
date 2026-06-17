package com.app.chat.dto;

import java.time.Instant;

public interface IncomingFriendRequestProjection {
    Long getId();

    Long getSenderId();

    String getFullName();

    String getAvatarUrl();

    Instant getSentAt();
}
