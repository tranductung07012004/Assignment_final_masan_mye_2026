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
}
