package com.app.chat.dto;

public interface ChatListItemProjection {
    Long getGroupId();
    String getType();
    String getTitle();
    String getAvatarUrl();
    Long getPeerId();
}
