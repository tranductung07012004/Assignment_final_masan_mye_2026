package com.app.chat.dto;


import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Email is required") // Data cannot be null,  "", " "
    @Email(message = "Email is not in the right format")
    private String email;

    @NotBlank(message = "fullName is required")
    private String fullName;

    @NotBlank(message = "Password is required")
    @Size(min = 3, message = "Password must have at least 3 characters")
    private String password;
}
