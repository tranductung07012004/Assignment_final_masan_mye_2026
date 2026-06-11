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
              AND (:beforeId IS NULL OR id < :beforeId)
            ORDER BY id DESC
            LIMIT :size
            """, nativeQuery = true)
    List<ChatMessage> findByGroupIdBeforeIdDesc(
            @Param("groupId") Long groupId,
            @Param("beforeId") Long beforeId,
            @Param("size") int size
    );
}
