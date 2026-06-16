package com.app.chat.dto;
import java.time.Instant;

public interface ChatListItemProjection {
    Long getGroupId();
    String getType();
    String getTitle();
    String getAvatarUrl();
    Long getPeerId();
    String getLastMessageContent();
    String getLastMessageType();
    Instant getLastMessageAt();
    Long getLastMessageSenderId();
    String getLastMessageSenderName();
}
