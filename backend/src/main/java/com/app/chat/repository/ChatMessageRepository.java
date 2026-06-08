package com.app.chat.repository;

import com.app.chat.dto.ChatMessageResponse;
import com.app.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {


    @Query(value = """
            SELECT *
            FROM chat_messages
            WHERE group_id = :groupId
            ORDER BY created_at ASC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<ChatMessage> findByGroupIdWithPagination(
            @Param("groupId") Long groupId,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    @Query(value = """
            SELECT cm.id,
                   cm.group_id,
                   cm.sender_member_id,
                   cm.content,
                   cm.message_type,
                   CAST(cm.metadata AS text) AS metadata,
                   cm.created_at,
                   cm.edited_at,
                   cm.deleted_at,
                   gp.full_name AS sender_full_name,
                   u.avatar_url AS sender_avatar_url
            FROM chat_messages cm
            LEFT JOIN users u ON u.id = cm.sender_member_id
            LEFT JOIN global_profiles gp ON gp.user_id = cm.sender_member_id
            WHERE cm.group_id = :groupId
            ORDER BY cm.created_at DESC
            LIMIT :limit OFFSET :offset
            """, nativeQuery = true)
    List<ChatMessageResponse> findByGroupIdWithSenderInfoAndPagination(
            @Param("groupId") Long groupId,
            @Param("limit") int limit,
            @Param("offset") int offset
    );

    @Query(value = """
            SELECT *
            FROM chat_messages
            WHERE group_id = :groupId
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
            """, nativeQuery = true)
    Optional<ChatMessage> findLastByGroupId(@Param("groupId") Long groupId);

    @Query(value = """
            SELECT *
            FROM chat_messages
            WHERE group_id = :groupId
              AND sender_member_id = :senderMemberId
              AND deleted_at IS NULL
            ORDER BY created_at DESC
            LIMIT 1
            """, nativeQuery = true)
    Optional<ChatMessage> findLatestByGroupIdAndSenderMemberId(
            @Param("groupId") Long groupId,
            @Param("senderMemberId") Long senderMemberId
    );

    @Query(value = """
            SELECT COUNT(*)
            FROM chat_messages
            WHERE group_id = :groupId
            """, nativeQuery = true)
    Long countByGroupId(@Param("groupId") Long groupId);

    @Modifying
    @Query(value = """
            DELETE FROM chat_messages
            WHERE group_id = :groupId
            """, nativeQuery = true)
    void deleteByGroupId(@Param("groupId") Long groupId);
}
