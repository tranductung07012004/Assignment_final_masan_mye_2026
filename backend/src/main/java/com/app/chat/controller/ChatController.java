package com.app.chat.controller;

import com.app.chat.dto.ApiResponse;
import com.app.chat.dto.ChatListItemResponse;
import com.app.chat.service.ChatServiceInterface;
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
}
