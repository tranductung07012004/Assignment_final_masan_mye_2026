package com.app.chat.repository;

import com.app.chat.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;

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
}
