package com.app.chat.controller;

import com.app.chat.dto.ApiResponse;
import com.app.chat.dto.UploadSignatureResponse;
import com.app.chat.service.UploadServiceInterface;
import com.app.chat.utils.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {
    private final UploadServiceInterface uploadService;

    public UploadController(UploadServiceInterface injectedUploadService) {
        this.uploadService = injectedUploadService;
    }

    @PostMapping("/signature")
    public ResponseEntity<ApiResponse<UploadSignatureResponse>> createSignature() {
        Long userId = SecurityUtil.getCurrentUserId();
        UploadSignatureResponse res = this.uploadService.createChatUploadSignature(userId);

        return ResponseEntity.ok(
                new ApiResponse<>("Upload signature created successfully", res)
        );
    }
}
