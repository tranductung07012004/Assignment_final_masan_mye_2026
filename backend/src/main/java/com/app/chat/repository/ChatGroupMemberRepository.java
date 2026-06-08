package com.app.chat.repository;


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
    List<ChatGroupMember> findByMemberId(@Param("groupId") Long memberId);

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
