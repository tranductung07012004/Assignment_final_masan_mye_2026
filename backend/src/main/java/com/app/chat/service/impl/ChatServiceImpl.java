package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.AddGroupMemberRequest;
import com.app.chat.dto.ChatListItemResponse;
import com.app.chat.dto.ChatMessageResponse;
import com.app.chat.dto.CreateGroupRequest;
import com.app.chat.dto.FriendResponse;
import com.app.chat.dto.GroupInfoResponse;
import com.app.chat.dto.GroupMemberResponse;
import com.app.chat.dto.GroupMessageResult;
import com.app.chat.dto.MessageCursorPageResponse;
import com.app.chat.dto.ResolvedMessageDto;
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
import com.app.chat.repository.FriendRequestRepository;
import com.app.chat.repository.UserRepository;
import com.app.chat.service.ChatServiceInterface;
import com.app.chat.utils.CloudinaryUrlValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class ChatServiceImpl implements ChatServiceInterface {
    private static final int GROUP_MEMBER_LIMIT = 10;
    private static final int GROUP_MEMBER_MINIMUM = 3;

    private static final Logger logger = LoggerFactory.getLogger(ChatServiceImpl.class);

    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final String cloudinaryCloudName;

    public ChatServiceImpl(
            ChatGroupRepository injectedChatGroupRepository,
            ChatGroupMemberRepository injectedChatGroupMemberRepository,
            ChatMessageRepository injectedChatMessageRepository,
            UserRepository injectedUserRepository,
            FriendRequestRepository injectedFriendRequestRepository,
            @Value("${cloudinary.cloud-name}") String injectedCloudinaryCloudName
    ) {
        this.chatGroupRepository = injectedChatGroupRepository;
        this.chatGroupMemberRepository = injectedChatGroupMemberRepository;
        this.chatMessageRepository = injectedChatMessageRepository;
        this.userRepository = injectedUserRepository;
        this.friendRequestRepository = injectedFriendRequestRepository;
        this.cloudinaryCloudName = injectedCloudinaryCloudName;
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
                .peerId(item.getPeerId())
                .lastMessageContent(item.getLastMessageContent())
                .lastMessageType(item.getLastMessageType())
                .lastMessageAt(item.getLastMessageAt())
                .lastMessageSenderId(item.getLastMessageSenderId())
                .lastMessageSenderName(item.getLastMessageSenderName())
                .build()
        );
    }

    @Override
    public Page<FriendResponse> searchFriends(Long currentUserId, String keyword, Pageable pageable) {
        if (currentUserId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        this.userRepository.findUserById(currentUserId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        String normalizedKeyword = keyword == null ? "%" : "%" + keyword.trim() + "%";

        return this.friendRequestRepository.searchFriends(
                currentUserId,
                normalizedKeyword,
                pageable
        ).map(item -> FriendResponse.builder()
                .id(item.getId())
                .fullName(item.getFullName())
                .avatarUrl(item.getAvatarUrl())
                .createdAt(item.getCreatedAt().atOffset(ZoneOffset.UTC))
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
            throw new ApplicationException(ErrorCode.RECEIVER_NOT_FOUND_IN_REQUEST);
        }

        if (senderId.equals(receiverId)) {
            throw new ApplicationException(ErrorCode.CANNOT_MESSAGE_SELF);
        }

        ResolvedMessageDto resolvedMessage = resolveOutgoingMessage(
                senderId,
                request.getMessageType(),
                request.getContent()
        );

        // Cai nay co can check khong nhi
        User sender = this.userRepository.findUserById(senderId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        // Cai nay co can check khong nhi
        this.userRepository.findUserById(receiverId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.RECEIVER_NOT_FOUND_IN_REQUEST));

        // Cai nay co can check khong nhi
        ChatGroup privateGroup = this.chatGroupRepository
                .findPrivateChatInformationBetweenMembers(senderId, receiverId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.PRIVATE_CHAT_NOT_FOUND));


        ChatMessage savedMessage = chatMessageRepository.save(ChatMessage.builder()
                .groupId(privateGroup.getId())
                .senderId(senderId)
                .content(resolvedMessage.getContent())
                .messageType(resolvedMessage.getMessageType())
                .metadata(resolvedMessage.getMetadata())
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
        int totalMembers = distinctOtherMembers.size() + 1;
        if (totalMembers < GROUP_MEMBER_MINIMUM) {
            throw new ApplicationException(ErrorCode.GROUP_MEMBER_MINIMUM_NOT_MET);
        }
        if (totalMembers > GROUP_MEMBER_LIMIT) {
            throw new ApplicationException(ErrorCode.GROUP_MEMBER_LIMIT_EXCEEDED);
        }

        List<Long> foundIds = this.userRepository.findAllByIds(distinctOtherMembers)
                .stream().map(u -> u.getId()).toList();
        List<Long> missingIds = distinctOtherMembers.stream()
                .filter(id -> !foundIds.contains(id))
                .toList();
        if (!missingIds.isEmpty()) {
            throw new ApplicationException(ErrorCode.USER_NOT_FOUND,
                    "User(s) not found: " + missingIds);
        }

        ChatGroup group = this.chatGroupRepository.save(ChatGroup.builder()
                .type("GROUP")
                .title(title.trim())
                .avatarUrl(request.getAvatarUrl())
                .createdBy(creatorId)
                .build());

        List<ChatGroupMember> memberships = new ArrayList<>();
        memberships.add(ChatGroupMember.builder()
                .groupId(group.getId())
                .memberId(creatorId)
                .createdBy(creatorId)
                .memberRole("OWNER")
                .build());
        for (Long memberId : distinctOtherMembers) {
            memberships.add(ChatGroupMember.builder()
                    .groupId(group.getId())
                    .memberId(memberId)
                    .createdBy(creatorId)
                    .memberRole("MEMBER")
                    .build());
        }
        this.chatGroupMemberRepository.saveAll(memberships);

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

        ResolvedMessageDto resolvedMessage = resolveOutgoingMessage(
                senderId,
                request.getMessageType(),
                request.getContent()
        );

        // Cho nay can check khong nhi, hot path nay nguy hiem qua
        User sender = userRepository.findUserById(senderId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        ChatMessage savedMessage = chatMessageRepository.save(ChatMessage.builder()
                .groupId(groupId)
                .senderId(senderId)
                .content(resolvedMessage.getContent())
                .messageType(resolvedMessage.getMessageType())
                .metadata(resolvedMessage.getMetadata())
                .build());

        // Cho nay check lam sao nhi, thong tin nay co nen cache lai khong nhi
        List<Long> memberIds = chatGroupMemberRepository.findByGroupId(groupId)
                .stream()
                .map(ChatGroupMember::getMemberId)
                .toList();

        return new GroupMessageResult(toChatMessageResponse(savedMessage, sender), memberIds);
    }

    @Override
    public MessageCursorPageResponse loadMessages(Long requesterId, Long groupId, Long beforeId, int size) {
        if (requesterId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        findAnyGroupByIdOrThrow(groupId);
        checkIfThisIsMemberOrOwnerOfGroupOrElseThrow(groupId, requesterId);

        int fetchSize = size + 1;
        List<ChatMessage> raw = chatMessageRepository.findByGroupIdBeforeIdDesc(groupId, beforeId, fetchSize);

        boolean hasMore = raw.size() == fetchSize;
        List<ChatMessage> page = hasMore ? raw.subList(0, size) : raw;

        List<Long> senderIds = page.stream().map(ChatMessage::getSenderId).distinct().toList();
        Map<Long, User> userMap = userRepository.findAllByIds(senderIds)
                .stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, u -> u));

        List<ChatMessageResponse> responses = page.stream()
                .map(msg -> {
                    User sender = userMap.get(msg.getSenderId());
                    if (msg.getDeletedAt() != null) {
                        ChatMessageResponse r = new ChatMessageResponse();
                        r.setId(msg.getId());
                        r.setGroupId(msg.getGroupId());
                        r.setSenderMemberId(msg.getSenderId());
                        r.setSenderFullName(sender != null ? sender.getFullName() : null);
                        r.setSenderAvatarUrl(sender != null ? sender.getAvatarUrl() : null);
                        r.setContent(null);
                        r.setMessageType(msg.getMessageType());
                        r.setCreatedAt(msg.getCreatedAt());
                        r.setEditedAt(msg.getEditedAt());
                        r.setDeletedAt(msg.getDeletedAt());
                        return r;
                    }
                    return sender != null
                            ? toChatMessageResponse(msg, sender)
                            : toChatMessageResponseWithoutSender(msg);
                })
                .toList();

        Long nextCursor = hasMore ? page.get(page.size() - 1).getId() : null;
        return MessageCursorPageResponse.builder()
                .messages(responses)
                .nextCursor(nextCursor)
                .build();
    }

    @Override
    public Map<Long, Integer> getUnreadCounts(Long userId) {
        List<Object[]> rows = this.chatGroupMemberRepository.findUnreadCountsForUser(userId);
        Map<Long, Integer> result = new java.util.HashMap<>();
        for (Object[] row : rows) {
            Long groupId = ((Number) row[0]).longValue();
            int count = ((Number) row[1]).intValue();
            result.put(groupId, count);
        }
        return result;
    }

    @Override
    @Transactional
    public void markRead(Long userId, Long groupId, Long lastReadMsgId) {
        this.chatGroupMemberRepository.advanceWatermark(groupId, userId, lastReadMsgId);
    }

    private ResolvedMessageDto resolveOutgoingMessage(
            Long senderId,
            String messageType,
            String content
    ) {
        String normalizedType = messageType == null || messageType.isBlank() ? "TEXT" : messageType.trim();

        if ("TEXT".equals(normalizedType)) {
            if (content == null || content.isBlank()) {
                throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_REQUIRED);
            }
            if (content.length() > 500) {
                throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_TOO_LONG);
            }
            return ResolvedMessageDto.builder()
                    .messageType("TEXT")
                    .content(content.trim())
                    .metadata(null)
                    .build();
        }

        if ("IMAGE".equals(normalizedType)) {
            if (content == null || content.isBlank()) {
                throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_REQUIRED);
            }
            String imageUrl = content.trim();
            if (imageUrl.length() > 2048) {
                throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_TOO_LONG);
            }
            if (!CloudinaryUrlValidator.isValidChatImageUrl(imageUrl, cloudinaryCloudName, senderId)) {
                throw new ApplicationException(ErrorCode.INVALID_IMAGE_URL);
            }
            return ResolvedMessageDto.builder()
                    .messageType("IMAGE")
                    .content(imageUrl)
                    .metadata(null)
                    .build();
        }

        if ("VIDEO".equals(normalizedType)) {
            if (content == null || content.isBlank()) {
                throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_REQUIRED);
            }
            String videoUrl = content.trim();
            if (videoUrl.length() > 2048) {
                throw new ApplicationException(ErrorCode.VIDEO_URL_IS_TOO_LONG);
            }
            if (!CloudinaryUrlValidator.isValidChatVideoUrl(videoUrl, cloudinaryCloudName, senderId)) {
                throw new ApplicationException(ErrorCode.INVALID_VIDEO_URL);
            }
            return ResolvedMessageDto.builder()
                    .messageType("VIDEO")
                    .content(videoUrl)
                    .metadata(null)
                    .build();
        }

        if ("STICKERS".equals(normalizedType)) {
            if (content == null || content.isBlank()) {
                throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_REQUIRED);
            }
            String stickerId = content.trim();
            if (stickerId.length() > 64) {
                throw new ApplicationException(ErrorCode.MESSAGE_CONTENT_TOO_LONG);
            }
            return ResolvedMessageDto.builder()
                    .messageType("STICKERS")
                    .content(stickerId)
                    .metadata(null)
                    .build();
        }

        throw new ApplicationException(ErrorCode.INVALID_MESSAGE_TYPE);
    }

    private ChatGroup findAnyGroupByIdOrThrow(Long groupId) {
        return this.chatGroupRepository.findById(groupId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.GROUP_NOT_FOUND));
    }

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

    private ChatMessageResponse toChatMessageResponseWithoutSender(ChatMessage message) {
        ChatMessageResponse response = new ChatMessageResponse();
        response.setId(message.getId());
        response.setGroupId(message.getGroupId());
        response.setSenderMemberId(message.getSenderId());
        response.setContent(message.getContent());
        response.setMessageType(message.getMessageType());
        response.setMetadata(message.getMetadata());
        response.setCreatedAt(message.getCreatedAt());
        response.setEditedAt(message.getEditedAt());
        response.setDeletedAt(message.getDeletedAt());
        return response;
    }
}
