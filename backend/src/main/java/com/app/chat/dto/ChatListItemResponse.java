package com.app.chat.dto;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatListItemResponse {
    private Long groupId;
    private String type;
    private String title;
    private String avatarUrl;
    private Long peerId;
    private String lastMessageContent;
    private String lastMessageType;
    private Instant lastMessageAt;
    private Long lastMessageSenderId;
    private String lastMessageSenderName;
}
