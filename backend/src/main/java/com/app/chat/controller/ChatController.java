package com.app.chat.controller;

import com.app.chat.dto.ApiResponse;
import com.app.chat.dto.ChatListItemResponse;
import com.app.chat.dto.FriendResponse;
import com.app.chat.dto.MessageCursorPageResponse;
import com.app.chat.service.ChatServiceInterface;
import com.app.chat.utils.SecurityUtil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatServiceInterface chatService;

    public ChatController(ChatServiceInterface injectedChatService) {
        this.chatService = injectedChatService;
    }
    @GetMapping("/list")
    public ResponseEntity<ApiResponse<Page<ChatListItemResponse>>> listChat(
            @RequestParam(defaultValue = "", required = false) String keyword,
            @PageableDefault(
                    page = 0,
                    size = 5
            )
            Pageable pageable
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        Page<ChatListItemResponse> chats = this.chatService.searchChats(
                currentUserId,
                keyword,
                pageable
        );
        return ResponseEntity
                .status(200)
                .body(
                        new ApiResponse<>("Retrieved chat list successfully", chats)
                );
    }

    @GetMapping("/friends")
    public ResponseEntity<ApiResponse<Page<FriendResponse>>> listFriends(
            @RequestParam(defaultValue = "", required = false) String keyword,
            @PageableDefault(
                    page = 0,
                    size = 5
            )
            Pageable pageable
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        Page<FriendResponse> friends = this.chatService.searchFriends(
                currentUserId,
                keyword,
                pageable
        );

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Retrieved friends list successfully", friends));
    }

    @GetMapping("/groups/{groupId}/messages")
    public ResponseEntity<ApiResponse<MessageCursorPageResponse>> getMessages(
            @PathVariable Long groupId,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(defaultValue = "20") int size
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();

        MessageCursorPageResponse result = this.chatService.loadMessages(
                currentUserId,
                groupId,
                beforeId,
                size
        );

        return ResponseEntity
                .status(200)
                .body(new ApiResponse<>("Retrieved messages successfully", result));
    }
}
