package com.app.chat.repository;

import com.app.chat.dto.FriendProjection;
import com.app.chat.dto.IncomingFriendRequestProjection;
import com.app.chat.entity.FriendRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    Optional<FriendRequest> findByLowUserIdAndHighUserId(Long lowUserId, Long highUserId);

    @Query(value = """
            SELECT CASE WHEN fr.low_user_id = :userId THEN fr.high_user_id ELSE fr.low_user_id END
            FROM friend_requests fr
            WHERE fr.status = 'ACCEPTED'
              AND (fr.low_user_id = :userId OR fr.high_user_id = :userId)
            """, nativeQuery = true)
    List<Long> findAcceptedFriendIds(@Param("userId") Long userId);

    @Query(
            value = """
            SELECT
                u.id AS id,
                u.full_name AS fullName,
                u.avatar_url AS avatarUrl,
                fr.created_at AS createdAt
            FROM friend_requests fr
            JOIN users u ON u.id = CASE
                WHEN fr.low_user_id = :currentUserId THEN fr.high_user_id
                ELSE fr.low_user_id
            END
            WHERE fr.status = 'ACCEPTED'
                AND (:currentUserId = fr.low_user_id OR :currentUserId = fr.high_user_id)
                AND u.full_name ILIKE :keyword
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM friend_requests fr
            JOIN users u ON u.id = CASE
                WHEN fr.low_user_id = :currentUserId THEN fr.high_user_id
                ELSE fr.low_user_id
            END
            WHERE fr.status = 'ACCEPTED'
                AND (:currentUserId = fr.low_user_id OR :currentUserId = fr.high_user_id)
                AND u.full_name ILIKE :keyword
            """,
            nativeQuery = true
    )
    Page<FriendProjection> searchFriends(
            @Param("currentUserId") Long currentUserId,
            @Param("keyword") String keyword,
            Pageable pageable
    );

    @Query(
            value = """
            SELECT
                fr.id AS id,
                u.id AS senderId,
                u.full_name AS fullName,
                u.avatar_url AS avatarUrl,
                fr.created_at AS sentAt
            FROM friend_requests fr
            JOIN users u ON u.id = fr.sender_id
            WHERE fr.receiver_id = :currentUserId
                AND fr.status = 'PENDING'
            ORDER BY fr.created_at DESC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM friend_requests fr
            WHERE fr.receiver_id = :currentUserId
                AND fr.status = 'PENDING'
            """,
            nativeQuery = true
    )
    Page<IncomingFriendRequestProjection> findIncomingPendingRequests(
            @Param("currentUserId") Long currentUserId,
            Pageable pageable
    );
}
