package com.app.chat.dto;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private Long id;
    private Long groupId;
    private Long senderMemberId;
    private String senderFullName;
    private String senderAvatarUrl;
    private String content;
    private String messageType;
    private String metadata;
    private OffsetDateTime createdAt;
    private OffsetDateTime editedAt;
    private OffsetDateTime deletedAt;
}
