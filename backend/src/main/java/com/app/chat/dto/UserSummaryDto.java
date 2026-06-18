package com.app.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// Fix 4 (Cache C): bản tóm tắt user dùng trên hot path gửi tin.
// KHÔNG cache entity User (có thể kéo theo lazy association + field thừa khi serialize ngoài Hibernate session).
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryDto {
    private Long id;
    private String fullName;
    private String avatarUrl;
}
