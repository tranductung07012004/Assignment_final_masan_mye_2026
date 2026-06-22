package com.app.chat.repository;

import com.app.chat.dto.UserSearchProjection;
import com.app.chat.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    @Query(value = """
            SELECT *
            FROM users
            WHERE users.id = :currentUserId
            """, nativeQuery = true)
    Optional<User> findUserById(@Param("currentUserId") Long currentUserId);

    @Query(value = """
            SELECT *
            FROM users
            WHERE users.email = :email
            """, nativeQuery = true)
    Optional<User> findByEmail(@Param("email") String email);

    @Query(value = """
            SELECT *
            FROM users
            WHERE users.id IN (:ids)
            """, nativeQuery = true)
    List<User> findAllByIds(@Param("ids") List<Long> ids);

    @Query(
            value = """
            SELECT
                u.id AS id,
                u.full_name AS fullName,
                u.avatar_url AS avatarUrl,
                fr.status AS friendRequestStatus,
                fr.sender_id AS friendRequestSenderId,
                fr.cooldown_at AS cooldownAt
            FROM users u
            LEFT JOIN friend_requests fr
                ON fr.low_user_id = LEAST(u.id, :currentUserId)
               AND fr.high_user_id = GREATEST(u.id, :currentUserId)
            WHERE u.id != :currentUserId
              AND u.full_name ILIKE :keyword
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM users u
            WHERE u.id != :currentUserId
              AND u.full_name ILIKE :keyword
            """,
            nativeQuery = true
    )
    Page<UserSearchProjection> searchUsers(
            @Param("currentUserId") Long currentUserId,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
