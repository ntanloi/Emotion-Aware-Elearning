package com.elearning.emotion.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;
import java.time.LocalDateTime;

@Entity
@Table(name = "media_assets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class MediaAsset {
    @Id
    @UuidGenerator
    @Column(columnDefinition = "CHAR(36)")
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploader_id", nullable = false)
    private User uploader;

    /** IMAGE | AUDIO | VIDEO */
    @Column(nullable = false, length = 20)
    private String type;

    @Column(nullable = false, length = 500)
    private String url;

    @Column(name = "file_name", length = 255)
    private String fileName;

    /**
     * Dinh danh noi bo de xoa/quan ly file tren storage provider: duong dan tuong doi tren dia
     * voi Local, public_id tren Cloudinary. Dung khi can xoa file (vd giang vien thay the media).
     */
    @Column(name = "public_id", length = 500)
    private String publicId;

    /** Chi cho AUDIO / VIDEO, co the null neu chua tinh duoc */
    @Column(name = "duration_sec")
    private Integer durationSec;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
