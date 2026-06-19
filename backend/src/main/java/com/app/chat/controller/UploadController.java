package com.app.chat.controller;

import com.app.chat.dto.ApiResponse;
import com.app.chat.dto.UploadResultResponse;
import com.app.chat.service.UploadService;
import com.app.chat.utils.SecurityUtil;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {
    private final UploadService uploadService;

    public UploadController(UploadService injectedUploadService) {
        this.uploadService = injectedUploadService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UploadResultResponse>> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "IMAGE") String resourceType
    ) {
        Long userId = SecurityUtil.getCurrentUserId();
        UploadResultResponse res = this.uploadService.storeChatMedia(userId, resourceType, file);

        return ResponseEntity.ok(
                new ApiResponse<>("Upload successful", res)
        );
    }
}
