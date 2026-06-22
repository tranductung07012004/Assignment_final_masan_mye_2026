package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.UploadResultResponse;
import com.app.chat.exception.ApplicationException;
import com.app.chat.service.UploadService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class UploadServiceImpl implements UploadService {

    private final long MAX_IMAGE_BYTES = 50L * 1024 * 1024;
    private final long MAX_VIDEO_BYTES = 200L * 1024 * 1024;

    private final Set<String> IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");
    private final Set<String> VIDEO_EXTENSIONS = Set.of("mp4", "webm", "mov");

    private final Path mediaRoot;
    private final String urlPrefix;

    public UploadServiceImpl(
            @Value("${app.media.root}") String injectedMediaRoot,
            @Value("${app.media.url-prefix}") String injectedUrlPrefix
    ) {
        this.mediaRoot = Paths.get(injectedMediaRoot).toAbsolutePath().normalize();
        this.urlPrefix = injectedUrlPrefix;
    }

    @Override
    public UploadResultResponse storeChatMedia(Long userId, String resourceType, MultipartFile file) {
        String normalizedType = resourceType == null || resourceType.isBlank()
                ? "IMAGE"
                : resourceType.trim().toUpperCase();
        boolean wantVideo = "VIDEO".equals(normalizedType);
        if (!wantVideo && !"IMAGE".equals(normalizedType)) {
            throw new ApplicationException(ErrorCode.INVALID_RESOURCE_TYPE);
        }

        if (file == null || file.isEmpty()) {
            throw new ApplicationException(ErrorCode.UPLOAD_FILE_REQUIRED);
        }

        long maxBytes = wantVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.getSize() > maxBytes) {
            throw new ApplicationException(ErrorCode.UPLOAD_FILE_TOO_LARGE);
        }

        LocalDate today = LocalDate.now();
        String relativeDir = String.format("chat/%d/%04d/%02d", userId, today.getYear(), today.getMonthValue());

        String extension = this.resolveExtension(file.getOriginalFilename(), wantVideo);
        String fileName = UUID.randomUUID() + "." + extension;

        Path targetDir = mediaRoot.resolve(relativeDir).normalize();
        if (!targetDir.startsWith(mediaRoot)) {

            throw new ApplicationException(ErrorCode.UPLOAD_FAILED);
        }

        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(targetDir);

            Files.copy(in, targetDir.resolve(fileName));
        } catch (IOException e) {
            throw new ApplicationException(ErrorCode.UPLOAD_FAILED);
        }

        String url = urlPrefix + "/" + relativeDir + "/" + fileName;
        return UploadResultResponse.builder().url(url).build();
    }

    private String resolveExtension(String originalFilename, boolean wantVideo) {
        String ext = this.extractExtension(originalFilename);
        if (ext == null) {
            throw new ApplicationException(ErrorCode.EXTENSION_OF_FILE_IS_NULL);
        }
        if ((wantVideo && !VIDEO_EXTENSIONS.contains(ext)) || !IMAGE_EXTENSIONS.contains(ext)) {
            throw new ApplicationException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }
        return ext;
    }

    private String extractExtension(String originalFilename) {
        if (originalFilename == null) {
            return null;
        }
        int dot = originalFilename.lastIndexOf('.');
        if (dot < 0 || dot == originalFilename.length() - 1) {
            return null;
        }
        return originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
    }

}
