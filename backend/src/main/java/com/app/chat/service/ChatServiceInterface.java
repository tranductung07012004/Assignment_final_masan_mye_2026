package com.app.chat.service;

import com.app.chat.dto.AddGroupMemberRequest;
import com.app.chat.dto.ChatListItemResponse;
import com.app.chat.dto.ChatMessageResponse;
import com.app.chat.dto.CreateGroupRequest;
import com.app.chat.dto.GroupInfoResponse;
import com.app.chat.dto.GroupMessageResult;
import com.app.chat.dto.SendDirectMessageRequest;
import com.app.chat.dto.SendGroupMessageRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ChatServiceInterface {

    Page<ChatListItemResponse> searchChats(Long currentUserId, String keyword, Pageable pageable);

    ChatMessageResponse sendDirectMessage(Long senderId, SendDirectMessageRequest request);

    GroupInfoResponse createGroup(Long creatorId, CreateGroupRequest request);

    GroupInfoResponse getGroupInfo(Long requesterId, Long groupId);

    void addMember(Long requesterId, Long groupId, AddGroupMemberRequest request);

    void kickMember(Long requesterId, Long groupId, Long targetMemberId);

    void leaveGroup(Long requesterId, Long groupId);

    GroupMessageResult sendGroupMessage(Long senderId, SendGroupMessageRequest request);
}
