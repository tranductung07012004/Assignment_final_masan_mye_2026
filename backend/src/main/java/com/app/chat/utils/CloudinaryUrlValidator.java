package com.app.chat.utils;

public final class CloudinaryUrlValidator {
    private CloudinaryUrlValidator() {
    }

    public static boolean isValidCloudinaryUrl(String url, String cloudName) {
        if (url == null || url.isBlank() || cloudName == null || cloudName.isBlank()) {
            return false;
        }
        return url.startsWith("https://res.cloudinary.com/" + cloudName + "/");
    }

    public static boolean isValidChatImageUrl(String url, String cloudName, Long senderId) {
        if (!isValidCloudinaryUrl(url, cloudName) || senderId == null) {
            return false;
        }
        return url.contains("/chat/" + senderId + "/");
    }
}
