package com.app.chat.repository;

import com.app.chat.dto.ChatListItemProjection;
import com.app.chat.entity.ChatGroup;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ChatGroupRepository extends JpaRepository<ChatGroup, Long> {


    @Query(value = """
            SELECT cg.*
            FROM chat_groups cg
            WHERE cg.type = 'PRIVATE'
                AND cg.id IN (
                        SELECT group_id
                        FROM chat_group_members
                        WHERE member_id IN (:memberAId, :memberBId)
                        GROUP BY group_id
                        HAVING COUNT(*) = 2
                )
            LIMIT 1
            """, nativeQuery = true)
    Optional<ChatGroup> findPrivateChatInformationBetweenMembers(
            @Param("memberAId") Long memberAId,
            @Param("memberBId") Long memberBId
    );

    @Query(
            value = """
            SELECT
                cg.id AS groupId,
                cg.type AS type,
                CASE
                    WHEN cg.type = 'GROUP' THEN cg.title ELSE peer.full_name
                END AS title,
                CASE
                    WHEN cg.type = 'GROUP' THEN cg.avatar_url ELSE peer.avatar_url
                END AS avatarUrl,
                peer_member.member_id AS peerId

            FROM chat_groups cg

            JOIN chat_group_members me ON me.group_id = cg.id AND me.member_id = :currentUserId

            LEFT JOIN chat_group_members peer_member
                ON peer_member.group_id = cg.id
                AND peer_member.member_id != :currentUserId
                AND cg.type = 'PRIVATE'

            LEFT JOIN users peer
                ON peer.id = peer_member.member_id

            WHERE
            ((cg.type = 'GROUP' AND cg.title ILIKE :keyword )
            OR
            (cg.type = 'PRIVATE' AND peer.full_name ILIKE :keyword ))
            """,

            countQuery = """
            SELECT COUNT(*)
            FROM chat_groups cg

            JOIN chat_group_members me
                ON me.group_id = cg.id
                AND me.member_id = :currentUserId

            LEFT JOIN chat_group_members peer_member
                ON peer_member.group_id = cg.id
                AND peer_member.member_id != :currentUserId
                AND cg.type = 'PRIVATE'

            LEFT JOIN users peer
                ON peer.id = peer_member.member_id

            WHERE
            ((cg.type = 'GROUP' AND cg.title ILIKE :keyword )
            OR
            (cg.type = 'PRIVATE' AND peer.full_name ILIKE :keyword ))
            """,
            nativeQuery = true
    )
    Page<ChatListItemProjection> searchChats(
            Long currentUserId,
            String keyword,
            Pageable pageable
    );
}
