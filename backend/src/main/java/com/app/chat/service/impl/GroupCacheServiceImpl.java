package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.UserSummaryDto;
import com.app.chat.entity.ChatGroupMember;
import com.app.chat.entity.User;
import com.app.chat.exception.ApplicationException;
import com.app.chat.repository.ChatGroupMemberRepository;
import com.app.chat.repository.ChatGroupRepository;
import com.app.chat.repository.UserRepository;
import com.app.chat.service.GroupCacheService;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class GroupCacheServiceImpl implements GroupCacheService {

    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final UserRepository userRepository;

    public GroupCacheServiceImpl(
            ChatGroupMemberRepository chatGroupMemberRepository,
            ChatGroupRepository chatGroupRepository,
            UserRepository userRepository
    ) {
        this.chatGroupMemberRepository = chatGroupMemberRepository;
        this.chatGroupRepository = chatGroupRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Cacheable(value = "group-members", key = "#groupId", sync = true)
    public List<String> getGroupMemberIds(Long groupId) {
        return chatGroupMemberRepository.findByGroupId(groupId)
                .stream()
                .map(ChatGroupMember::getMemberId)
                .map(String::valueOf)
                .toList();
    }

    @Override
    @CacheEvict(value = "group-members", key = "#groupId")
    public void invalidateCacheGroupMembers(Long groupId) {}


    @Override
    @Cacheable(value = "private-chat",
            key = "#senderId < #receiverId ? #senderId + ':' + #receiverId : #receiverId + ':' + #senderId")
    public Long findPrivateChatGroupId(Long senderId, Long receiverId) {
        return chatGroupRepository.findPrivateChatInformationBetweenMembers(senderId, receiverId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.PRIVATE_CHAT_NOT_FOUND))
                .getId();
    }


    @Override
    @Cacheable(value = "user", key = "#userId")
    public UserSummaryDto getUserById(Long userId) {
        User u = userRepository.findUserById(userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));
        return new UserSummaryDto(u.getId(), u.getFullName(), u.getAvatarUrl());
    }
}
