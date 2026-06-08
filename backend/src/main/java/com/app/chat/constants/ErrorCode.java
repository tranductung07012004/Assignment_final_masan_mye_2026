package com.app.chat.constants;

import lombok.Getter;

@Getter
public enum ErrorCode {
    USER_NOT_FOUND("User could not be found", 404),
    CURRENT_USER_ID_FROM_TOKEN_IS_NULL("Current user id from token is null", 400),

    // Auth module
    EMAIL_ALREADY_REGISTERED("Email already registered", 409),
    INVALID_TOKEN("Invalid token", 401),
    REFRESH_TOKEN_MISSING("Refresh token is missing", 401),
    REFRESH_TOKEN_DOES_NOT_EXISTS_IN_DB("Refresh token does not exits in db", 401),
    PASSWORD_NOT_CORRECT("Password does not match", 400),
    OLD_PASSWORD_NOT_CORRECT("Old password is not correct", 400),
    OLD_PASSWORD_REQUIRED("Old password is required when changing password", 400),
    PASSWORD_CONFIRMATION_MISMATCH("New password and confirm password do not match", 400);

    private final String message;
    private final int status;

    ErrorCode(String message, int status) {
        this.message = message;
        this.status = status;
    }
}
