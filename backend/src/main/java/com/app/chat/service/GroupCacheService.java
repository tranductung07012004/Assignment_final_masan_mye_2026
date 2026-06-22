package com.app.chat.service;

import com.app.chat.dto.UserSummaryDto;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public interface GroupCacheService {
    List<String> getGroupMemberIds(Long groupId);

    void invalidateCacheGroupMembers(Long groupId);

    Long findPrivateChatGroupId(Long senderId, Long receiverId);

    UserSummaryDto getUserById(Long userId);
}
