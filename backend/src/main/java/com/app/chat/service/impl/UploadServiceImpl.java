package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.UploadSignatureResponse;
import com.app.chat.exception.ApplicationException;
import com.app.chat.service.UploadServiceInterface;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class UploadServiceImpl implements UploadServiceInterface {
    private final Cloudinary cloudinary;

    public UploadServiceImpl(Cloudinary injectedCloudinary) {
        this.cloudinary = injectedCloudinary;
    }

    @Override
    public UploadSignatureResponse createChatUploadSignature(Long userId, String resourceType) {
        String normalizedType = resourceType == null || resourceType.isBlank()
                ? "IMAGE"
                : resourceType.trim().toUpperCase();
        if (!"IMAGE".equals(normalizedType) && !"VIDEO".equals(normalizedType)) {
            throw new ApplicationException(ErrorCode.INVALID_RESOURCE_TYPE);
        }

        long timestamp = System.currentTimeMillis() / 1000;
        String folder = "chat/" + userId;

        Map<String, Object> paramsToSign = ObjectUtils.asMap(
                "timestamp", timestamp,
                "folder", folder
        );

        String signature = cloudinary.apiSignRequest(
                paramsToSign,
                cloudinary.config.apiSecret,
                1 // signatureVersion: 1 đại diện cho v1 (SHA-1), 2 đại diện cho v2 (SHA-256)
        );

        String uploadPath = "VIDEO".equals(normalizedType) ? "video/upload" : "image/upload";
        String uploadUrl = "https://api.cloudinary.com/v1_1/"
                + cloudinary.config.cloudName
                + "/"
                + uploadPath;

        return UploadSignatureResponse.builder()
                .signature(signature)
                .timestamp(timestamp)
                .apiKey(cloudinary.config.apiKey)
                .cloudName(cloudinary.config.cloudName)
                .uploadUrl(uploadUrl)
                .folder(folder)
                .build();
    }
}
