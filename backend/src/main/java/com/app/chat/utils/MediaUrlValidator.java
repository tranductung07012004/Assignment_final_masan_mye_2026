package com.app.chat.utils;

public final class MediaUrlValidator {
    private MediaUrlValidator() {
    }

    // URL hợp lệ phải bắt đầu bằng "{urlPrefix}/chat/{senderId}/" — nghĩa là media
    // do chính app này lưu, dưới đúng thư mục của người gửi. Chặn URL ngoài / cross-user.
    public static boolean isValidChatMediaUrl(String url, String urlPrefix, Long senderId) {
        if (url == null || url.isBlank() || urlPrefix == null || urlPrefix.isBlank() || senderId == null) {
            return false;
        }
        return url.startsWith(urlPrefix + "/chat/" + senderId + "/");
    }
}
