package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.UploadResultResponse;
import com.app.chat.exception.ApplicationException;
import com.app.chat.service.UploadService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.util.UUID;

@Service
public class UploadServiceImpl implements UploadService {

    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;  // 10MB
    private static final long MAX_VIDEO_BYTES = 30L * 1024 * 1024;  // 30MB

    private final Path mediaRoot;
    private final String urlPrefix;

    public UploadServiceImpl(
            @Value("${app.media.root}") String injectedMediaRoot,
            @Value("${app.media.url-prefix}") String injectedUrlPrefix
    ) {
        this.mediaRoot = Paths.get(injectedMediaRoot).toAbsolutePath().normalize();
        this.urlPrefix = stripTrailingSlash(injectedUrlPrefix);
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

        byte[] bytes;
        try {
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new ApplicationException(ErrorCode.UPLOAD_FAILED);
        }

        // Không tin extension/Content-Type client gửi — sniff magic bytes để xác định loại thật.
        DetectedMedia detected = detect(bytes);
        if (detected == null || detected.video != wantVideo) {
            throw new ApplicationException(ErrorCode.UNSUPPORTED_MEDIA_TYPE);
        }

        // chat/{userId}/{yyyy}/{MM}/{uuid}.{ext} — shard theo tháng để 1 thư mục không phình to.
        LocalDate today = LocalDate.now();
        String relativeDir = String.format("chat/%d/%04d/%02d", userId, today.getYear(), today.getMonthValue());
        String fileName = UUID.randomUUID() + "." + detected.extension;

        Path targetDir = mediaRoot.resolve(relativeDir).normalize();
        if (!targetDir.startsWith(mediaRoot)) {
            // an toàn tuyệt đối — không bao giờ xảy ra với input ở trên, nhưng chặn path traversal.
            throw new ApplicationException(ErrorCode.UPLOAD_FAILED);
        }

        try {
            Files.createDirectories(targetDir);
            Files.write(targetDir.resolve(fileName), bytes);
        } catch (IOException e) {
            throw new ApplicationException(ErrorCode.UPLOAD_FAILED);
        }

        String url = urlPrefix + "/" + relativeDir + "/" + fileName;
        return UploadResultResponse.builder().url(url).build();
    }

    private static String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    // ---- magic-byte detection ----

    private static final class DetectedMedia {
        final String extension;
        final boolean video;

        DetectedMedia(String extension, boolean video) {
            this.extension = extension;
            this.video = video;
        }
    }

    private static DetectedMedia detect(byte[] b) {
        if (b.length < 12) {
            return null;
        }

        // JPEG: FF D8 FF
        if (u(b[0]) == 0xFF && u(b[1]) == 0xD8 && u(b[2]) == 0xFF) {
            return new DetectedMedia("jpg", false);
        }
        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (u(b[0]) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
            return new DetectedMedia("png", false);
        }
        // GIF: "GIF8"
        if (b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') {
            return new DetectedMedia("gif", false);
        }
        // WebP: "RIFF"...."WEBP"
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
            return new DetectedMedia("webp", false);
        }
        // WebM / Matroska (EBML): 1A 45 DF A3
        if (u(b[0]) == 0x1A && u(b[1]) == 0x45 && u(b[2]) == 0xDF && u(b[3]) == 0xA3) {
            return new DetectedMedia("webm", true);
        }
        // ISO base media (MP4 / MOV): bytes 4..7 == "ftyp"
        if (b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p') {
            // major brand ở bytes 8..11; "qt  " => QuickTime (.mov), còn lại coi là mp4.
            boolean quicktime = b[8] == 'q' && b[9] == 't';
            return new DetectedMedia(quicktime ? "mov" : "mp4", true);
        }
        return null;
    }

    private static int u(byte value) {
        return value & 0xFF;
    }
}
