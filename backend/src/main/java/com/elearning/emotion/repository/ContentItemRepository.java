package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ContentItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ContentItemRepository extends JpaRepository<ContentItem, String> {
    List<ContentItem> findByCourseIdAndSectionCodeOrderByOrderIndex(String courseId, String sectionCode);

    /** Cac hoat dong thuoc 1 Nhom hoat dong (ContentGroup) cu the, xem V4 migration */
    List<ContentItem> findByGroupIdOrderByOrderIndex(String groupId);

    /** Cac hoat dong TRUC THUOC THANG 1 muc sidebar, khong nam trong Nhom nao (group_id IS NULL) -
     *  giu tuong thich nguoc cho cac muc dang dung kieu phang (chua tao Nhom) */
    List<ContentItem> findByCourseIdAndSectionCodeAndGroupIsNullOrderByOrderIndex(String courseId, String sectionCode);

    /** Lay tat ca VOCAB_SET kem thong tin khoa hoc chi voi 1 cau JOIN FETCH duy nhat */
    @Query("SELECT ci FROM ContentItem ci JOIN FETCH ci.course c WHERE ci.type = 'VOCAB_SET' ORDER BY c.title ASC, ci.orderIndex ASC")
    List<ContentItem> findAllVocabSetsWithCourse();

    long countByCourseId(String courseId);
    List<ContentItem> findByCourseId(String courseId);

    @Query("SELECT DISTINCT ci FROM ContentItem ci LEFT JOIN FETCH ci.videoMedia LEFT JOIN FETCH ci.group WHERE ci.course.id = :courseId ORDER BY ci.orderIndex ASC")
    List<ContentItem> findByCourseIdWithMedia(@Param("courseId") String courseId);

    @Query("SELECT DISTINCT ci FROM ContentItem ci LEFT JOIN FETCH ci.videoMedia LEFT JOIN FETCH ci.group WHERE ci.course.id = :courseId AND ci.isPreview = true ORDER BY ci.orderIndex ASC")
    List<ContentItem> findPreviewItemsByCourseId(@Param("courseId") String courseId);

    List<ContentItem> findByType(String type);

    @Query("SELECT ci FROM ContentItem ci JOIN FETCH ci.course c WHERE c.teacher.id = :teacherId AND ci.type = :type")
    List<ContentItem> findByTeacherIdAndType(@Param("teacherId") String teacherId, @Param("type") String type);

    @Query("select c.id from ContentItem c where c.course.id = :courseId and c.type = 'VIDEO_LECTURE' and c.videoMedia is not null")
    List<String> findTrackableVideoIds(@Param("courseId") String courseId);
}
