package com.app.chat.dto;

import lombok.Data;

@Data
public class SendGroupMessageRequest {
    private Long groupId;
    private String content;
}
