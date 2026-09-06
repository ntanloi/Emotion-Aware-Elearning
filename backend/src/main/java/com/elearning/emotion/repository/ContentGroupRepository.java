package com.elearning.emotion.repository;

import com.elearning.emotion.entity.ContentGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContentGroupRepository extends JpaRepository<ContentGroup, String> {
    List<ContentGroup> findByCourseIdAndSectionCodeOrderByOrderIndex(String courseId, String sectionCode);

    /** Tat ca nhom hoat dong cua 1 khoa hoc, moi Part (sectionCode) gom nhau lai - dung cho tag
     *  picker "mo rong ra Part khac" khi soan cau hoi (vd de thi thu tong hop nhieu Part). */
    List<ContentGroup> findByCourseIdOrderBySectionCodeAscOrderIndexAsc(String courseId);
}