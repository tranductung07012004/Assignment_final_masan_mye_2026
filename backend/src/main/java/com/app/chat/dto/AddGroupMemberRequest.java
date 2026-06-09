package com.app.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AddGroupMemberRequest {

    @NotNull(message = "Member id is required")
    private Long memberId;
}
