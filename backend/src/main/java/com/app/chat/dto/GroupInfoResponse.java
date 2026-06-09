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
public class GroupInfoResponse {
    private Long groupId;
    private String title;
    private String avatarUrl;
    private List<GroupMemberResponse> members;
}
