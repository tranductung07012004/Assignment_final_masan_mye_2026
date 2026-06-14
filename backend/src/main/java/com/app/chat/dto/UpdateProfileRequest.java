package com.app.chat.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email is not in the right format")
    private String email;

    @NotBlank(message = "Full name is required")
    private String fullName;

    private String oldPassword;

    @Size(min = 3, message = "Password must have at least 3 characters")
    private String newPassword;

    private String confirmNewPassword;

    private String avatarUrl;
}
