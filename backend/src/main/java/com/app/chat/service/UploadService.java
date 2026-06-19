package com.app.chat.service;

import com.app.chat.dto.UploadResultResponse;
import org.springframework.web.multipart.MultipartFile;

public interface UploadService {
    UploadResultResponse storeChatMedia(Long userId, String resourceType, MultipartFile file);
}
