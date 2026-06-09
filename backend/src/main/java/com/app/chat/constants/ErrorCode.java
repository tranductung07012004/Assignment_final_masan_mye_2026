package com.app.chat.constants;

import lombok.Getter;

@Getter
public enum ErrorCode {
    USER_NOT_FOUND("User could not be found", 404),
    CURRENT_USER_ID_FROM_TOKEN_IS_NULL("Current user id from token is null", 400),
    RECEIVER_NOT_FOUND("Receiver could not be found", 404),
    CANNOT_MESSAGE_SELF("Cannot send a direct message to yourself", 400),
    MESSAGE_CONTENT_REQUIRED("Message content is required", 400),
    MESSAGE_CONTENT_TOO_LONG("Message content must not exceed 500 characters", 400),
    PRIVATE_CHAT_NOT_FOUND("Private chat between these users does not exist", 404),

    // Group
    GROUP_NOT_FOUND("Group could not be found", 404),
    GROUP_MEMBER_NOT_FOUND("Member could not be found in this group", 404),
    NOT_A_GROUP_MEMBER("You are not a member of this group", 403),
    NOT_GROUP_OWNER("Only the group owner can perform this action", 403),
    GROUP_MEMBER_ALREADY_EXISTS("User is already a member of this group", 409),
    GROUP_MEMBER_LIMIT_EXCEEDED("Group has reached the maximum member limit of 10", 400),
    GROUP_TITLE_REQUIRED("Group title is required", 400),
    THIS_API_IS_NOT_SUPPORTED_FOR_OWNER_KICK_OWNER("Owner cannot kick owner in this API", 400),
    // Auth
    ACCESS_TOKEN_NOT_FOUND("Request does not have access token in header", 401),
    INVALID_ACCESS_TOKEN("Access token is invalid", 401),
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
