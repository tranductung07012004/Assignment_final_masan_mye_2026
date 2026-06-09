package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.AddGroupMemberRequest;
import com.app.chat.dto.ChatListItemResponse;
import com.app.chat.dto.ChatMessageResponse;
import com.app.chat.dto.CreateGroupRequest;
import com.app.chat.dto.GroupInfoResponse;
import com.app.chat.dto.GroupMemberResponse;
import com.app.chat.dto.GroupMessageResult;
import com.app.chat.dto.SendDirectMessageRequest;
import com.app.chat.dto.SendGroupMessageRequest;
import com.app.chat.entity.ChatGroup;
import com.app.chat.entity.ChatGroupMember;
import com.app.chat.entity.ChatMessage;
import com.app.chat.entity.User;
import com.app.chat.exception.ApplicationException;
import com.app.chat.repository.ChatGroupMemberRepository;
import com.app.chat.repository.ChatGroupRepository;
import com.app.chat.repository.ChatMessageRepository;
import com.app.chat.repository.UserRepository;
import com.app.chat.service.ChatServiceInterface;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ChatServiceImpl implements ChatServiceInterface {
    private static final int GROUP_MEMBER_LIMIT = 10;

    private static final Logger logger = LoggerFactory.getLogger(ChatServiceImpl.class);

    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;

    public ChatServiceImpl(
            ChatGroupRepository injectedChatGroupRepository,
            ChatGroupMemberRepository injectedChatGroupMemberRepository,
            ChatMessageRepository injectedChatMessageRepository,
            UserRepository injectedUserRepository
    ) {
        this.chatGroupRepository = injectedChatGroupRepository;
        this.chatGroupMemberRepository = injectedChatGroupMemberRepository;
        this.chatMessageRepository = injectedChatMessageRepository;
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
                .type(item.getType())
                .title(item.getTitle())
                .avatarUrl(item.getAvatarUrl())
                .build()
        );
    }

    @Override
    @Transactional
    public ChatMessageResponse sendDirectMessage(Long senderId, SendDirectMessageRequest request) {
        if (senderId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        Long receiverId = request.getReceiverId();
        if (receiverId == null) {
            throw new ApplicationException(ErrorCode.RECEIVER_NOT_FOUND);
        }

        if (senderId.equals(receiverId)) {
            throw new ApplicationException(ErrorCode.CANNOT_MESSAGE_SELF);
        }

        String content = request.getContent();
        if (content == null || content.isBlank()) {
            throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_REQUIRED);
        }
        if (content.length() > 500) {
            throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_TOO_LONG);
        }

        User sender = userRepository.findUserById(senderId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        userRepository.findUserById(receiverId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.RECEIVER_NOT_FOUND));

        ChatGroup privateGroup = chatGroupRepository
                .findPrivateChatInformationBetweenMembers(senderId, receiverId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.PRIVATE_CHAT_NOT_FOUND));


        ChatMessage savedMessage = chatMessageRepository.save(ChatMessage.builder()
                .groupId(privateGroup.getId())
                .senderId(senderId)
                .content(content.trim())
                .messageType("TEXT")
                .build());

        return toChatMessageResponse(savedMessage, sender);
    }

    @Override
    @Transactional
    public GroupInfoResponse createGroup(Long creatorId, CreateGroupRequest request) {
        if (creatorId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        String title = request.getTitle();
        if (title == null || title.trim().isBlank()) {
            throw new ApplicationException(ErrorCode.GROUP_TITLE_REQUIRED);
        }

        this.userRepository.findUserById(creatorId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        List<Long> memberIds = request.getMemberIds() == null ? new ArrayList<>() : request.getMemberIds();

        // deduplicate and exclude creator from memberIds (creator is always added separately)
        List<Long> distinctOtherMembers = memberIds.stream()
                .filter(id -> !id.equals(creatorId))
                .distinct()
                .toList();

        // +1 for the creator
        if (distinctOtherMembers.size() + 1 > GROUP_MEMBER_LIMIT) {
            throw new ApplicationException(ErrorCode.GROUP_MEMBER_LIMIT_EXCEEDED);
        }

        for (Long memberId : distinctOtherMembers) {
            this.userRepository.findUserById(memberId)
                    .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND,
                            "User with id: " + memberId + " not found"));
        }

        ChatGroup group = this.chatGroupRepository.save(ChatGroup.builder()
                .type("GROUP")
                .title(title.trim())
                .avatarUrl(request.getAvatarUrl())
                .createdBy(creatorId)
                .build());

        // Save creator as OWNER
       this.chatGroupMemberRepository.save(ChatGroupMember.builder()
                .groupId(group.getId())
                .memberId(creatorId)
                .createdBy(creatorId)
                .memberRole("OWNER")
                .build());

        // Save remaining members as MEMBER
        for (Long memberId : distinctOtherMembers) {
            this.chatGroupMemberRepository.save(ChatGroupMember.builder()
                    .groupId(group.getId())
                    .memberId(memberId)
                    .createdBy(creatorId)
                    .memberRole("MEMBER")
                    .build());
        }

        return buildGroupInfoResponse(group);
    }

    @Override
    public GroupInfoResponse getGroupInfo(Long requesterId, Long groupId) {
        if (requesterId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        ChatGroup group = checkIfGroupExistedOrThrow(groupId);
        checkIfThisIsMemberOrOwnerOfGroupOrElseThrow(groupId, requesterId);

        return buildGroupInfoResponse(group);
    }

    @Override
    @Transactional
    public void addMember(Long requesterId, Long groupId, AddGroupMemberRequest request) {
        if (requesterId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        this.checkIfGroupExistedOrThrow(groupId);
        this.checkIfThisIsOwnerOfGroupOrElseThrow(groupId, requesterId);

        Long newMemberId = request.getMemberId();
        this.userRepository.findUserById(newMemberId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        this.chatGroupMemberRepository.findByGroupIdAndMemberId(groupId, newMemberId)
                .ifPresent(m -> { throw new ApplicationException(ErrorCode.GROUP_MEMBER_ALREADY_EXISTS); });

        if (this.chatGroupMemberRepository.countByGroupId(groupId) >= GROUP_MEMBER_LIMIT) {
            throw new ApplicationException(ErrorCode.GROUP_MEMBER_LIMIT_EXCEEDED);
        }

        this.chatGroupMemberRepository.save(ChatGroupMember.builder()
                .groupId(groupId)
                .memberId(newMemberId)
                .createdBy(requesterId)
                .memberRole("MEMBER")
                .build());
    }

    @Override
    @Transactional
    public void kickMember(Long requesterId, Long groupId, Long targetMemberId) {
        if (requesterId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        this.checkIfGroupExistedOrThrow(groupId);
        this.checkIfThisIsOwnerOfGroupOrElseThrow(groupId, requesterId);

        if (requesterId.equals(targetMemberId)) {
            throw new ApplicationException(ErrorCode.THIS_API_IS_NOT_SUPPORTED_FOR_OWNER_KICK_OWNER);
        }

        this.chatGroupMemberRepository.deleteByGroupIdAndMemberId(groupId, targetMemberId);
    }

    @Override
    @Transactional
    public void leaveGroup(Long requesterId, Long groupId) {
        if (requesterId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        this.checkIfGroupExistedOrThrow(groupId);

        ChatGroupMember memberShip = checkIfThisIsMemberOrOwnerOfGroupOrElseThrow(groupId, requesterId);

        if ("OWNER".equals(memberShip.getMemberRole())) {
            Optional<ChatGroupMember> nextOwnerOpt = chatGroupMemberRepository
                    .findOldestMemberExcluding(groupId, requesterId);

            if (nextOwnerOpt.isPresent()) {
                ChatGroupMember nextOwner = nextOwnerOpt.get();
                nextOwner.setMemberRole("OWNER");
                this.chatGroupMemberRepository.save(nextOwner);
            }
        }

        this.chatGroupMemberRepository.deleteByGroupIdAndMemberId(groupId, requesterId);
    }

    @Override
    @Transactional
    public GroupMessageResult sendGroupMessage(Long senderId, SendGroupMessageRequest request) {
        if (senderId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        Long groupId = request.getGroupId();

        this.checkIfGroupExistedOrThrow(groupId);
        this.checkIfThisIsMemberOrOwnerOfGroupOrElseThrow(groupId, senderId);

        String content = request.getContent();
        if (content == null || content.isBlank()) {
            throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_REQUIRED);
        }
        if (content.length() > 500) {
            throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_TOO_LONG);
        }

        User sender = userRepository.findUserById(senderId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        ChatMessage savedMessage = chatMessageRepository.save(ChatMessage.builder()
                .groupId(groupId)
                .senderId(senderId)
                .content(content.trim())
                .messageType("TEXT")
                .build());

        List<Long> memberIds = chatGroupMemberRepository.findByGroupId(groupId)
                .stream()
                .map(ChatGroupMember::getMemberId)
                .toList();

        return new GroupMessageResult(toChatMessageResponse(savedMessage, sender), memberIds);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private ChatGroup checkIfGroupExistedOrThrow(Long groupId) {
        return this.chatGroupRepository.findById(groupId)
                .filter(g -> "GROUP".equals(g.getType()))
                .orElseThrow(() -> new ApplicationException(ErrorCode.GROUP_NOT_FOUND));
    }

    private ChatGroupMember checkIfThisIsMemberOrOwnerOfGroupOrElseThrow(Long groupId, Long userId) {
        return this.chatGroupMemberRepository.findByGroupIdAndMemberId(groupId, userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.NOT_A_GROUP_MEMBER));
    }

    private void checkIfThisIsOwnerOfGroupOrElseThrow(Long groupId, Long userId) {
        ChatGroupMember membership = this.chatGroupMemberRepository
                .findByGroupIdAndMemberId(groupId, userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.NOT_A_GROUP_MEMBER));
        if (!"OWNER".equals(membership.getMemberRole())) {
            throw new ApplicationException(ErrorCode.NOT_GROUP_OWNER);
        }
    }

    private GroupInfoResponse buildGroupInfoResponse(ChatGroup group) {
        List<GroupMemberResponse> members = this.chatGroupMemberRepository
                .findMembersWithUserInfoByGroupId(group.getId())
                .stream()
                .map(p -> GroupMemberResponse.builder()
                        .userId(p.getUserId())
                        .fullName(p.getFullName())
                        .avatarUrl(p.getAvatarUrl())
                        .memberRole(p.getMemberRole())
                        .build())
                .toList();

        return GroupInfoResponse.builder()
                .groupId(group.getId())
                .title(group.getTitle())
                .avatarUrl(group.getAvatarUrl())
                .members(members)
                .build();
    }

    private ChatMessageResponse toChatMessageResponse(ChatMessage message, User sender) {
        ChatMessageResponse response = new ChatMessageResponse();
        response.setId(message.getId());
        response.setGroupId(message.getGroupId());
        response.setSenderMemberId(message.getSenderId());
        response.setSenderFullName(sender.getFullName());
        response.setSenderAvatarUrl(sender.getAvatarUrl());
        response.setContent(message.getContent());
        response.setMessageType(message.getMessageType());
        response.setMetadata(message.getMetadata());
        response.setCreatedAt(message.getCreatedAt());
        response.setEditedAt(message.getEditedAt());
        response.setDeletedAt(message.getDeletedAt());
        return response;
    }
}
