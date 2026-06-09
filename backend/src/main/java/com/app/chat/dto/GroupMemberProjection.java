package com.app.chat.dto;

public interface GroupMemberProjection {
    Long getUserId();
    String getFullName();
    String getAvatarUrl();
    String getMemberRole();
}
