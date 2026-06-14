package com.app.chat.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UploadSignatureResponse {
    private String signature;
    private long timestamp;
    private String apiKey;
    private String cloudName;
    private String uploadUrl;
    private String folder;
}
