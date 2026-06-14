package com.app.chat.repository;


import com.app.chat.dto.GroupMemberProjection;
import com.app.chat.entity.ChatGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatGroupMemberRepository extends JpaRepository<ChatGroupMember, Long> {
    @Query(value = """
            SELECT *
            FROM chat_group_members
            WHERE member_id = :memberId
            """, nativeQuery = true)
    List<ChatGroupMember> findByMemberId(@Param("memberId") Long memberId);

    @Query(value = """
            SELECT COUNT(*)
            FROM chat_group_members
            WHERE group_id = :groupId
            """, nativeQuery = true)
    int countByGroupId(@Param("groupId") Long groupId);

    @Query(value = """
            SELECT *
            FROM chat_group_members
            WHERE group_id = :groupId
              AND member_id != :excludeMemberId
            ORDER BY joined_at ASC
            LIMIT 1
            """, nativeQuery = true)
    Optional<ChatGroupMember> findOldestMemberExcluding(
            @Param("groupId") Long groupId,
            @Param("excludeMemberId") Long excludeMemberId
    );

    @Query(value = """
            SELECT
                u.id        AS userId,
                u.full_name AS fullName,
                u.avatar_url AS avatarUrl,
                cgm.member_role AS memberRole
            FROM chat_group_members cgm
            JOIN users u ON u.id = cgm.member_id
            WHERE cgm.group_id = :groupId
            """, nativeQuery = true)
    List<GroupMemberProjection> findMembersWithUserInfoByGroupId(@Param("groupId") Long groupId);

    @Query(value = """
            SELECT *
            FROM chat_group_members
            WHERE group_id = :groupId
            """, nativeQuery = true)
    List<ChatGroupMember> findByGroupId(@Param("groupId") Long groupId);

    @Query(value = """
            SELECT *
            FROM chat_group_members
            WHERE group_id = :groupId
              AND member_id = :memberId
            LIMIT 1
            """, nativeQuery = true)
    Optional<ChatGroupMember> findByGroupIdAndMemberId(
            @Param("groupId") Long groupId,
            @Param("memberId") Long memberId
    );

    @Modifying
    @Query(value = """
            DELETE
            FROM chat_group_members
            WHERE group_id = :groupId
              AND member_id = :memberId
            """, nativeQuery = true)
    void deleteByGroupIdAndMemberId(
            @Param("groupId") Long groupId,
            @Param("memberId") Long memberId
    );

    @Modifying
    @Query(value = """
            DELETE
            FROM chat_group_members
            WHERE group_id = :groupId
            """, nativeQuery = true)
    void deleteByGroupId(@Param("groupId") Long groupId);
}
