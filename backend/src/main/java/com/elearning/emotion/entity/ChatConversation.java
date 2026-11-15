package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_conversations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatConversation {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Builder.Default
    @Column(name = "context_type", nullable = false, length = 20)
    private String contextType = "COURSE_ADVICE";

    @Column(name = "context_ref_id", columnDefinition = "CHAR(36)")
    private String contextRefId;

    @Column(length = 200)
    private String title;

    @PrePersist
    void onCreate() { if (startedAt == null) startedAt = LocalDateTime.now(); }
}
