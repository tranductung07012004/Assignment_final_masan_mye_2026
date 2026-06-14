package com.app.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendDirectMessageRequest {

    @NotNull(message = "Receiver id is required")
    private Long receiverId;

    private String content;

    private String messageType;
}
