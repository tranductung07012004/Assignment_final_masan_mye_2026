package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.ChatListItemResponse;
import com.app.chat.exception.ApplicationException;
import com.app.chat.repository.ChatGroupRepository;
import com.app.chat.repository.UserRepository;
import com.app.chat.service.ChatServiceInterface;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class ChatServiceImpl implements ChatServiceInterface {
    private final ChatGroupRepository chatGroupRepository;
    private final UserRepository userRepository;

    private final static Logger logger = LoggerFactory.getLogger(ChatServiceImpl.class);

    public ChatServiceImpl(
            ChatGroupRepository injectedChatGroupRepository,
            UserRepository injectedUserRepository
    ) {
        this.chatGroupRepository = injectedChatGroupRepository;
        this.userRepository = injectedUserRepository;
    }

    @Override
    public Page<ChatListItemResponse> searchChats(Long currentUserId, String keyword, Pageable pageable) {
        if (currentUserId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        this.userRepository.findUserById(currentUserId)
                .orElseThrow(() -> {
                    logger.warn("User with id: {} not found in database", currentUserId);
                    return new ApplicationException(ErrorCode.USER_NOT_FOUND, "User with id: " + currentUserId + " not found in database");
                });

        String normalizedKeyword = keyword == null ? "%" : "%" + keyword.trim() + "%";

        return this.chatGroupRepository.searchChats(
                currentUserId,
                normalizedKeyword,
                pageable
        ).map(item -> ChatListItemResponse.builder()
                .groupId(item.getGroupId())
                .title(item.getTitle())
                .avatarUrl(item.getAvatarUrl())
                .build()
        );
    }
}
