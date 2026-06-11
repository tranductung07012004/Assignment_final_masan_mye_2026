package com.app.chat.controller;

import com.app.chat.dto.ApiResponse;
import com.app.chat.dto.FriendRequestResponse;
import com.app.chat.dto.SendFriendRequestRequest;
import com.app.chat.service.FriendServiceInterface;
import com.app.chat.utils.SecurityUtil;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendServiceInterface friendService;

    public FriendController(FriendServiceInterface injectedFriendService) {
        this.friendService = injectedFriendService;
    }

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<Page<FriendRequestResponse>>> listIncomingFriendRequests(
            @PageableDefault(page = 0, size = 5) Pageable pageable
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        Page<FriendRequestResponse> requests = this.friendService.listIncomingFriendRequests(
                currentUserId,
                pageable
        );

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Retrieved friend requests successfully", requests));
    }

    @PostMapping("/requests")
    public ResponseEntity<ApiResponse<Void>> sendFriendRequest(
            @Valid @RequestBody SendFriendRequestRequest request
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        this.friendService.sendFriendRequest(currentUserId, request.getReceiverId());

        return ResponseEntity
                .status(201)
                .body(new ApiResponse<>("Friend request sent successfully", null));
    }

    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<ApiResponse<Void>> acceptFriendRequest(
            @PathVariable Long requestId
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        this.friendService.acceptFriendRequest(currentUserId, requestId);

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Friend request accepted successfully", null));
    }

    @PostMapping("/requests/{requestId}/decline")
    public ResponseEntity<ApiResponse<Void>> declineFriendRequest(
            @PathVariable Long requestId
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        this.friendService.declineFriendRequest(currentUserId, requestId);

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Friend request declined successfully", null));
    }
}
