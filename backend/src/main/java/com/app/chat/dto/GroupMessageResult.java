package com.app.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class GroupMessageResult {
    private ChatMessageResponse message;
    private List<Long> memberIds;
}
