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

    private final long MAX_IMAGE_BYTES = 50L * 1024 * 1024;   // 50MB
    private final long MAX_VIDEO_BYTES = 200L * 1024 * 1024;  // 200MB

    // Extension cho phép — lấy từ tên file client gửi nhưng phải nằm trong allowlist này.
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

        // Format file: chat/{userId}/{yyyy}/{MM}/{uuid}.{ext}
        LocalDate today = LocalDate.now();
        String relativeDir = String.format("chat/%d/%04d/%02d", userId, today.getYear(), today.getMonthValue());

        // Lấy extension từ tên file client gửi, nhưng phải khớp allowlist của resourceType.
        String extension = this.resolveExtension(file.getOriginalFilename(), wantVideo);
        String fileName = UUID.randomUUID() + "." + extension;

        Path targetDir = mediaRoot.resolve(relativeDir).normalize();
        if (!targetDir.startsWith(mediaRoot)) {
            // bao dam khong co chuyen ghi vao ngoai thu muc mediaRoot duoc inject tu "app.media.root" trong application.yml.
            throw new ApplicationException(ErrorCode.UPLOAD_FAILED);
        }

        try (InputStream in = file.getInputStream()) {
            Files.createDirectories(targetDir);
            // Stream thẳng ra đĩa — không load cả file vào heap (quan trọng với video 200MB).
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

    // ---- magic-byte detection (giữ lại để tham khảo — hiện KHÔNG dùng) ----

//    private static final class DetectedMedia {
//        final String extension;
//        final boolean video;
//
//        DetectedMedia(String extension, boolean video) {
//            this.extension = extension;
//            this.video = video;
//        }
//    }

    // Not sure about this check, so i will not use it
    // private static DetectedMedia detect(byte[] b) {
    //     int len = b.length;
    //     if (len < 3) return null; // Tối thiểu phải đủ check JPEG

    //     // 1. JPEG (Cần 3 bytes)
    //     if (u(b[0]) == 0xFF && u(b[1]) == 0xD8 && u(b[2]) == 0xFF) {
    //         return new DetectedMedia("jpg", false);
    //     }

    //     // 2. PNG (Cần 4 bytes)
    //     if (len >= 4 && u(b[0]) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') {
    //         return new DetectedMedia("png", false);
    //     }

    //     // 3. GIF (Cần 4 bytes)
    //     if (len >= 4 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') {
    //         return new DetectedMedia("gif", false);
    //     }

    //     // 4. WebP (Cần đủ 12 bytes)
    //     if (len >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
    //             && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') {
    //         return new DetectedMedia("webp", false);
    //     }

    //     // 5. WebM / Matroska (MKV) (Cần 4 bytes)
    //     if (len >= 4 && u(b[0]) == 0x1A && u(b[1]) == 0x45 && u(b[2]) == 0xDF && u(b[3]) == 0xA3) {
    //         // Lưu ý: Tạm thời coi là mp4 hoặc webm tùy bạn, nhưng trình duyệt thường chịu MP4 tốt hơn.
    //         // Nếu muốn an toàn cho thẻ <video> trên web, cân nhắc đổi extension thành mkv hoặc webm tùy nhu cầu.
    //         return new DetectedMedia("webm", true);
    //     }

    //     // 6. MP4 / MOV (Cần ít nhất 8 bytes để check ftyp, và 12 bytes để phân biệt MOV)
    //     if (len >= 8 && b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p') {
    //         boolean quicktime = (len >= 12) && (b[8] == 'q' && b[9] == 't');
    //         return new DetectedMedia(quicktime ? "mov" : "mp4", true);
    //     }

    //     return null;
    // }

    // private static int u(byte value) {
    //     return value & 0xFF;
    // }
}
