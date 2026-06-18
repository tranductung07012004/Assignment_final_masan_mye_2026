package com.app.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MessageCursorPageResponse {
    private List<ChatMessageResponse> messages;
    private Long nextCursor;
}
