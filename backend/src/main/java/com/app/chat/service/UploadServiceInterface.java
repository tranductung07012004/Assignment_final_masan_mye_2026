package com.app.chat.service;

import com.app.chat.dto.UploadSignatureResponse;

public interface UploadServiceInterface {
    UploadSignatureResponse createChatUploadSignature(Long userId, String resourceType);
}
