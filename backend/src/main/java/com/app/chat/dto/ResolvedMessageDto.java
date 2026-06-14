package com.app.chat.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ResolvedMessageDto {
    private String messageType;
    private String content;
    private String metadata;
}
