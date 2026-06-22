package com.app.chat.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "chat_group_members")
public class ChatGroupMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "group_id")
    private Long groupId;

    @Column(name = "member_id")
    private Long memberId;

    @Column(name = "created_by")
    private Long createdBy;

    @Column(name = "member_role")
    private String memberRole;

    @Column(name = "joined_at")
    private OffsetDateTime joinedAt;

    @Column(name = "last_read_msg_id")
    private Long lastReadMsgId;

    @PrePersist
    protected void onCreate() {
        this.joinedAt = OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS);
    }
}
