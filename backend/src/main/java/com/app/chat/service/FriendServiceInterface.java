package com.app.chat.service;

import com.app.chat.dto.FriendRequestResponse;
import com.app.chat.dto.UserSearchResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface FriendServiceInterface {

    Page<UserSearchResponse> searchUsers(Long currentUserId, String keyword, Pageable pageable);

    void sendFriendRequest(Long currentUserId, Long receiverId);

    Page<FriendRequestResponse> listIncomingFriendRequests(Long currentUserId, Pageable pageable);

    void acceptFriendRequest(Long currentUserId, Long requestId);

    void declineFriendRequest(Long currentUserId, Long requestId);
}
