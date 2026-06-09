package com.app.chat.repository;

import com.app.chat.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    @Modifying
    @Query(value = """
        DELETE FROM refresh_tokens r
        WHERE r.hash_token = :hashToken
    """, nativeQuery = true)
    int deleteByHashToken(@Param("hashToken") String hashToken);

    @Query(value = """
                SELECT *
                FROM refresh_tokens rt
                WHERE rt.hash_token = :hashToken
            """, nativeQuery = true)
    Optional<RefreshToken> findByHashToken(@Param("hashToken") String hashToken);

    @Modifying
    @Query(value = """
            UPDATE  refresh_tokens r
            SET hash_token = :hash,
                created_at = :createdAt
            WHERE r.user_id = :userId
    """, nativeQuery = true)
    int updateByUserId(
            @Param("userId") Long userId,
            @Param("hash") String hash,
            @Param("createdAt") OffsetDateTime createdAt
    );
}
