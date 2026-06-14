package com.app.chat.controller;

import com.app.chat.dto.ApiResponse;
import com.app.chat.dto.UserSearchResponse;
import com.app.chat.service.FriendServiceInterface;
import com.app.chat.utils.SecurityUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final FriendServiceInterface friendService;

    public UserController(FriendServiceInterface injectedFriendService) {
        this.friendService = injectedFriendService;
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<Page<UserSearchResponse>>> searchUsers(
            @RequestParam(defaultValue = "", required = false) String keyword,
            @PageableDefault(page = 0, size = 5) Pageable pageable
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        Page<UserSearchResponse> users = this.friendService.searchUsers(
                currentUserId,
                keyword,
                pageable
        );

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Retrieved users successfully", users));
    }
}
