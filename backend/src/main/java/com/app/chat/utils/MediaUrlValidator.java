package com.app.chat.utils;

public final class MediaUrlValidator {
    private MediaUrlValidator() {
    }

    public static boolean isValidChatMediaUrl(String url, String urlPrefix, Long senderId) {
        if (url == null || url.isBlank() || urlPrefix == null || urlPrefix.isBlank() || senderId == null) {
            return false;
        }
        return url.startsWith(urlPrefix + "/chat/" + senderId + "/");
    }
}
