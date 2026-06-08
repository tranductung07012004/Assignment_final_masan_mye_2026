package com.app.chat.service;

import com.app.chat.dto.ChatListItemResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public interface ChatServiceInterface {
    Page<ChatListItemResponse> searchChats(
            Long currentUserId,
            String keyword,
            Pageable pageable);
}
