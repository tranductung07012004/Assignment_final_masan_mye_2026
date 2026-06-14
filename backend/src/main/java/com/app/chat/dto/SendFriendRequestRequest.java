package com.app.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendFriendRequestRequest {

    @NotNull(message = "Receiver id is required")
    private Long receiverId;
}
