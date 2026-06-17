package com.app.chat.service.impl;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.FriendRequestResponse;
import com.app.chat.dto.FriendRequestUserResponse;
import com.app.chat.dto.UserSearchResponse;
import com.app.chat.entity.ChatGroup;
import com.app.chat.entity.ChatGroupMember;
import com.app.chat.entity.FriendRequest;
import com.app.chat.entity.User;
import com.app.chat.exception.ApplicationException;
import com.app.chat.repository.ChatGroupMemberRepository;
import com.app.chat.repository.ChatGroupRepository;
import com.app.chat.repository.FriendRequestRepository;
import com.app.chat.repository.UserRepository;
import com.app.chat.service.FriendServiceInterface;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class FriendServiceImpl implements FriendServiceInterface {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_ACCEPTED = "ACCEPTED";
    private static final String STATUS_REJECTED = "REJECTED";
    private static final String CHAT_TYPE_PRIVATE = "PRIVATE";
    private static final String MEMBER_ROLE = "MEMBER";
    private static final int REJECT_COOLDOWN_DAYS = 7;

    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final ChatGroupMemberRepository chatGroupMemberRepository;

    public FriendServiceImpl(
            UserRepository injectedUserRepository,
            FriendRequestRepository injectedFriendRequestRepository,
            ChatGroupRepository injectedChatGroupRepository,
            ChatGroupMemberRepository injectedChatGroupMemberRepository
    ) {
        this.userRepository = injectedUserRepository;
        this.friendRequestRepository = injectedFriendRequestRepository;
        this.chatGroupRepository = injectedChatGroupRepository;
        this.chatGroupMemberRepository = injectedChatGroupMemberRepository;
    }

    @Override
    public Page<UserSearchResponse> searchUsers(Long currentUserId, String keyword, Pageable pageable) {
        if (currentUserId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        this.userRepository.findUserById(currentUserId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        String normalizedKeyword = keyword == null ? "%" : "%" + keyword.trim() + "%";

        return this.userRepository.searchUsers(
                currentUserId,
                normalizedKeyword,
                pageable
        ).map(item -> UserSearchResponse.builder()
                .id(item.getId())
                .fullName(item.getFullName())
                .avatarUrl(item.getAvatarUrl())
                .friendRequestStatus(item.getFriendRequestStatus())
                .friendRequestSenderId(item.getFriendRequestSenderId())
                .cooldownAt(item.getCooldownAt())
                .build()
        );
    }

    @Override
    public Page<FriendRequestResponse> listIncomingFriendRequests(Long currentUserId, Pageable pageable) {
        if (currentUserId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        this.userRepository.findUserById(currentUserId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        return this.friendRequestRepository.findIncomingPendingRequests(currentUserId, pageable)
                .map(item -> FriendRequestResponse.builder()
                        .id(item.getId())
                        .from(FriendRequestUserResponse.builder()
                                .id(item.getSenderId())
                                .fullName(item.getFullName())
                                .avatarUrl(item.getAvatarUrl())
                                .build())
                        .sentAt(item.getSentAt().atOffset(ZoneOffset.UTC))
                        .build()
                );
    }

    @Override
    @Transactional
    public void sendFriendRequest(Long currentUserId, Long receiverId) {
        if (currentUserId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        if (currentUserId.equals(receiverId)) {
            throw new ApplicationException(ErrorCode.CANNOT_ADD_SELF);
        }

        this.userRepository.findUserById(currentUserId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        this.userRepository.findUserById(receiverId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        long lowUserId = Math.min(currentUserId, receiverId);
        long highUserId = Math.max(currentUserId, receiverId);

        FriendRequest existingRequest = this.friendRequestRepository
                .findByLowUserIdAndHighUserId(lowUserId, highUserId)
                .orElse(null);

        if (existingRequest == null) {
            FriendRequest newRequest = FriendRequest.builder()
                    .lowUserId(lowUserId)
                    .highUserId(highUserId)
                    .senderId(currentUserId)
                    .receiverId(receiverId)
                    .status(STATUS_PENDING)
                    .cooldownAt(null)
                    .createdAt(OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS))
                    .build();
            this.friendRequestRepository.save(newRequest);
            return;
        }

        String status = existingRequest.getStatus();

        if (STATUS_PENDING.equals(status)) {
            if (currentUserId.equals(existingRequest.getSenderId())) {
                throw new ApplicationException(ErrorCode.FRIEND_REQUEST_ALREADY_SENT);
            }
            throw new ApplicationException(ErrorCode.FRIEND_REQUEST_ALREADY_RECEIVED);
        }

        if (STATUS_ACCEPTED.equals(status)) {
            throw new ApplicationException(ErrorCode.ALREADY_FRIENDS);
        }

        if (STATUS_REJECTED.equals(status)) {
            OffsetDateTime cooldownAt = existingRequest.getCooldownAt();
            OffsetDateTime now = OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS);
            boolean inCooldown = cooldownAt != null && cooldownAt.isAfter(now);

            if (inCooldown && currentUserId.equals(existingRequest.getSenderId())) {
                throw new ApplicationException(ErrorCode.FRIEND_REQUEST_COOLDOWN);
            }

            existingRequest.setSenderId(currentUserId);
            existingRequest.setReceiverId(receiverId);
            existingRequest.setStatus(STATUS_PENDING);
            existingRequest.setCooldownAt(null);
            this.friendRequestRepository.save(existingRequest);
        }
    }

    @Override
    @Transactional
    public void acceptFriendRequest(Long currentUserId, Long requestId) {
        FriendRequest request = this.getPendingRequestForReceiver(currentUserId, requestId);

        if (STATUS_ACCEPTED.equals(request.getStatus())) {
            throw new ApplicationException(ErrorCode.ALREADY_FRIENDS);
        }

        if (!STATUS_PENDING.equals(request.getStatus())) {
            throw new ApplicationException(ErrorCode.FRIEND_REQUEST_NOT_PENDING);
        }

        User sender = this.userRepository.findUserById(request.getSenderId())
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));

        ChatGroup privateGroup = this.chatGroupRepository.save(ChatGroup.builder()
                .type(CHAT_TYPE_PRIVATE)
                .title(sender.getFullName())
                .avatarUrl(null)
                .createdBy(currentUserId)
                .build());

        this.chatGroupMemberRepository.save(ChatGroupMember.builder()
                .groupId(privateGroup.getId())
                .memberId(currentUserId)
                .createdBy(currentUserId)
                .memberRole(MEMBER_ROLE)
                .build());

        this.chatGroupMemberRepository.save(ChatGroupMember.builder()
                .groupId(privateGroup.getId())
                .memberId(sender.getId())
                .createdBy(currentUserId)
                .memberRole(MEMBER_ROLE)
                .build());

        request.setStatus(STATUS_ACCEPTED);
        request.setCooldownAt(null);
        this.friendRequestRepository.save(request);
    }

    @Override
    @Transactional
    public void declineFriendRequest(Long currentUserId, Long requestId) {
        FriendRequest request = this.getPendingRequestForReceiver(currentUserId, requestId);

        if (STATUS_ACCEPTED.equals(request.getStatus())) {
            throw new ApplicationException(ErrorCode.ALREADY_FRIENDS);
        }

        if (!STATUS_PENDING.equals(request.getStatus())) {
            throw new ApplicationException(ErrorCode.FRIEND_REQUEST_NOT_PENDING);
        }

        OffsetDateTime now = OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS);
        request.setStatus(STATUS_REJECTED);
        request.setCooldownAt(now.plusDays(REJECT_COOLDOWN_DAYS));
        this.friendRequestRepository.save(request);
    }

    @Override
    public List<Long> getFriendIds(Long userId) {
        return this.friendRequestRepository.findAcceptedFriendIds(userId);
    }

    private FriendRequest getPendingRequestForReceiver(Long currentUserId, Long requestId) {
        if (currentUserId == null) {
            throw new ApplicationException(ErrorCode.CURRENT_USER_ID_FROM_TOKEN_IS_NULL);
        }

        FriendRequest request = this.friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.FRIEND_REQUEST_NOT_FOUND));

        if (!currentUserId.equals(request.getReceiverId())) {
            throw new ApplicationException(ErrorCode.FRIEND_REQUEST_NOT_RECEIVER);
        }

        return request;
    }
}
