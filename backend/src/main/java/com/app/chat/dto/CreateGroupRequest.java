package com.app.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {

    @NotBlank(message = "Group title is required")
    private String title;

    private String avatarUrl;

    @NotNull(message = "Member list is required")
    private List<Long> memberIds;
}
