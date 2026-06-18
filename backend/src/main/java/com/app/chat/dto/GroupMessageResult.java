package com.app.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class GroupMessageResult {
    private ChatMessageResponse message;
    // Fix 4: List<String> để khớp value cache "group-members" (tránh ClassCastException Integer/Long của Jackson).
    private List<String> memberIds;
}
