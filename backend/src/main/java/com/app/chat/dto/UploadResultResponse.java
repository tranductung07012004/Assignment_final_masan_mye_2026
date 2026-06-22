package com.app.chat.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UploadResultResponse {
    private String url;
}
