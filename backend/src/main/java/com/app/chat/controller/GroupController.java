package com.app.chat.controller;

import com.app.chat.dto.AddGroupMemberRequest;
import com.app.chat.dto.ApiResponse;
import com.app.chat.dto.CreateGroupRequest;
import com.app.chat.dto.GroupInfoResponse;
import com.app.chat.service.ChatService;
import com.app.chat.utils.SecurityUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final ChatService chatService;

    public GroupController(ChatService injectedChatService) {
        this.chatService = injectedChatService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse<GroupInfoResponse>> createGroup(
            @Valid @RequestBody CreateGroupRequest request
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        GroupInfoResponse group = this.chatService.createGroup(currentUserId, request);
        return ResponseEntity.status(201)
                .body(new ApiResponse<>("Group created successfully", group));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<GroupInfoResponse>> getGroupInfo(
            @PathVariable Long groupId
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        GroupInfoResponse group = this.chatService.getGroupInfo(currentUserId, groupId);
        return ResponseEntity.ok(new ApiResponse<>("Group info retrieved successfully", group));
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @PathVariable Long groupId,
            @Valid @RequestBody AddGroupMemberRequest request
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        this.chatService.addMember(currentUserId, groupId, request);
        return ResponseEntity.ok(new ApiResponse<>("Member added successfully", null));
    }

    @DeleteMapping("/{groupId}/members/{memberId}")
    public ResponseEntity<ApiResponse<Void>> kickMember(
            @PathVariable Long groupId,
            @PathVariable Long memberId
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        this.chatService.kickMember(currentUserId, groupId, memberId);
        return ResponseEntity.ok(new ApiResponse<>("Member removed successfully", null));
    }

    @DeleteMapping("/{groupId}/leave")
    public ResponseEntity<ApiResponse<Void>> leaveGroup(
            @PathVariable Long groupId
    ) {
        Long currentUserId = SecurityUtil.getCurrentUserId();
        this.chatService.leaveGroup(currentUserId, groupId);
        return ResponseEntity.ok(new ApiResponse<>("Left group successfully", null));
    }
}
