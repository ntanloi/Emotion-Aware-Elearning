package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ContentItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContentItemRepository extends JpaRepository<ContentItem, String> {
    List<ContentItem> findByCourseIdAndSectionCodeOrderByOrderIndex(String courseId, String sectionCode);

    /** Cac hoat dong thuoc 1 Nhom hoat dong (ContentGroup) cu the, xem V4 migration */
    List<ContentItem> findByGroupIdOrderByOrderIndex(String groupId);

    /** Cac hoat dong TRUC THUOC THANG 1 muc sidebar, khong nam trong Nhom nao (group_id IS NULL) -
     *  giu tuong thich nguoc cho cac muc dang dung kieu phang (chua tao Nhom) */
    List<ContentItem> findByCourseIdAndSectionCodeAndGroupIsNullOrderByOrderIndex(String courseId, String sectionCode);
}
