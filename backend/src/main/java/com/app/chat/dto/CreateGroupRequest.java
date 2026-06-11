package com.app.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {

    @NotBlank(message = "Group title is required")
    private String title;

    private String avatarUrl;

    @NotNull(message = "Member list is required")
    @Size(min = 2, message = "Group must include at least 2 other members")
    private List<Long> memberIds;
}
