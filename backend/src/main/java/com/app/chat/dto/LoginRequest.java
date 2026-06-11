package com.app.chat.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Email is required")
    @Email(message = "Email is not in the right format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 3, message = "Password must have at least 3 characters")
    private String password;

    @NotBlank(message = "Device id is required")
    private String deviceId;
}
