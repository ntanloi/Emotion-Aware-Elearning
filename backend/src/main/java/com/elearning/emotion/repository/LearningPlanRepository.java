package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ContentItem;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.util.List;

/**
 * Truy vấn chỉ-đọc phục vụ "gợi ý bài nên học hôm nay" trong báo cáo ngày.
 * Dùng interface Repository riêng để không đụng vào ContentItemRepository.
 */
public interface LearningPlanRepository extends Repository<ContentItem, String> {

    interface NextItemProjection {
        String getItemId();
        String getTitle();
        String getSectionCode();
        String getType();
        String getGroupTitle();
        String getCourseId();
        String getCourseTitle();
    }

    /**
     * Các bài CHƯA hoàn thành (chưa có dòng content_item_progress.is_completed = 1 ở bất kỳ practice_type)
     * trong các khoá học PUBLISHED mà học viên đã ghi danh, theo đúng thứ tự giáo viên sắp xếp.
     */
    @Query(value = """
        SELECT ci.id AS itemId, ci.title AS title, ci.section_code AS sectionCode, ci.type AS type,
               g.title AS groupTitle, c.id AS courseId, c.title AS courseTitle
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id AND c.status = 'PUBLISHED'
        JOIN content_items ci ON ci.course_id = c.id
        LEFT JOIN content_groups g ON g.id = ci.group_id
        WHERE e.user_id = :userId
          AND NOT EXISTS (
              SELECT 1 FROM content_item_progress p
              WHERE p.content_item_id = ci.id AND p.user_id = :userId AND p.is_completed = 1)
        ORDER BY e.enrolled_at ASC, ci.section_code ASC, COALESCE(g.order_index, 0) ASC, ci.order_index ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<NextItemProjection> findNextUncompletedItems(@Param("userId") String userId, @Param("limit") int limit);
}