package com.app.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SendDirectMessageRequest {

    @NotNull(message = "Receiver id is required")
    private Long receiverId;

    @NotBlank(message = "Message content is required")
    @Size(max = 500, message = "Message content must not exceed 500 characters")
    private String content;
}
