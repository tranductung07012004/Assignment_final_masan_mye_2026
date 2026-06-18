package com.app.chat.service;

import com.app.chat.constants.ErrorCode;
import com.app.chat.dto.UserSummaryDto;
import com.app.chat.entity.ChatGroupMember;
import com.app.chat.entity.User;
import com.app.chat.exception.ApplicationException;
import com.app.chat.repository.ChatGroupMemberRepository;
import com.app.chat.repository.ChatGroupRepository;
import com.app.chat.repository.UserRepository;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;

 // Fix 4: cache các DB lookup trên hot path gửi tin.
 //
 // Tách ra bean riêng (không gọi this.method trong cùng class) vì @Cacheable dùng Spring AOP proxy —
 // self-invocation sẽ không kích hoạt proxy → cache không hoạt động.
 //
@Service
public class GroupCacheService {

    private final ChatGroupMemberRepository chatGroupMemberRepository;
    private final ChatGroupRepository chatGroupRepository;
    private final UserRepository userRepository;

    public GroupCacheService(
            ChatGroupMemberRepository chatGroupMemberRepository,
            ChatGroupRepository chatGroupRepository,
            UserRepository userRepository
    ) {
        this.chatGroupMemberRepository = chatGroupMemberRepository;
        this.chatGroupRepository = chatGroupRepository;
        this.userRepository = userRepository;
    }

     // Cache A (ưu tiên cao nhất) — thay query findByGroupId trên mỗi tin group,
     // đồng thời phục vụ luôn membership check (caller dùng .contains(senderId)).
     //
     // Trả List<String> (KHÔNG List<Long>): GenericJackson2JsonRedisSerializer không lưu type phần tử
     // của collection → số đọc lại thành Integer, iterate như Long sẽ ném ClassCastException.
     //
     // sync = true: chống cache stampede khi TTL hết hạn đúng lúc burst (nhiều thread cùng miss
     // → chỉ 1 thread/instance chạy findByGroupId, số còn lại chờ kết quả).
     //
    @Cacheable(value = "group-members", key = "#groupId", sync = true)
    public List<String> getGroupMemberIds(Long groupId) {
        return chatGroupMemberRepository.findByGroupId(groupId)
                .stream()
                .map(ChatGroupMember::getMemberId)
                .map(String::valueOf)
                .toList();
    }

    
     // Invalidate Cache A. Phải được gọi SAU khi transaction commit (xem ChatServiceImpl.evictGroupMembersAfterCommit)
     // để tránh race: evict mid-transaction rồi một sendGroupMessage song song repopulate lại danh sách cũ.
     //
    @CacheEvict(value = "group-members", key = "#groupId")
    public void evictGroupMembers(Long groupId) {
        // chỉ để kích hoạt @CacheEvict
    }

    
    // Cache B — private chat giữa 2 user là immutable (không bao giờ xóa/đổi trong codebase hiện tại)
    // → không cần invalidate, TTL-only. Key chuẩn hóa min:max để chat(A,B) và chat(B,A) dùng chung entry.
     
    @Cacheable(value = "private-chat",
            key = "#senderId < #receiverId ? #senderId + ':' + #receiverId : #receiverId + ':' + #senderId")
    public Long findPrivateChatGroupId(Long senderId, Long receiverId) {
        return chatGroupRepository.findPrivateChatInformationBetweenMembers(senderId, receiverId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.PRIVATE_CHAT_NOT_FOUND))
                .getId();
    }

    
     // Cache C — tóm tắt user (fullName, avatarUrl) cho dòng tin. Cache DTO nhỏ, không cache entity.
     
    @Cacheable(value = "user", key = "#userId")
    public UserSummaryDto getUserById(Long userId) {
        User u = userRepository.findUserById(userId)
                .orElseThrow(() -> new ApplicationException(ErrorCode.USER_NOT_FOUND));
        return new UserSummaryDto(u.getId(), u.getFullName(), u.getAvatarUrl());
    }
}
