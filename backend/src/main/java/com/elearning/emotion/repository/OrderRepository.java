package com.elearning.emotion.repository;

import com.elearning.emotion.entity.Order;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, String>, JpaSpecificationExecutor<Order> {
    Optional<Order> findByOrderCode(String orderCode);

    /**
     * H1: Khóa bi quan (PESSIMISTIC_WRITE) để tránh race conditions khi xử lý Webhook và Polling đồng thời
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT o FROM Order o WHERE o.orderCode = :orderCode")
    Optional<Order> findByOrderCodeWithLock(@Param("orderCode") String orderCode);

    List<Order> findByUserIdOrderByCreatedAtDesc(String userId);
    List<Order> findByUserIdAndStatus(String userId, String status);
    boolean existsByUserIdAndCourseIdAndStatus(String userId, String courseId, String status);
    Optional<Order> findFirstByUserIdAndCourseIdAndStatusOrderByCreatedAtDesc(String userId, String courseId, String status);

    @Query("SELECT o FROM Order o WHERE o.status = 'PENDING' AND o.createdAt <= :threshold")
    List<Order> findPendingOrdersOlderThan(@Param("threshold") LocalDateTime threshold);

    @Query("SELECT o FROM Order o WHERE o.course.teacher.id = :teacherId ORDER BY o.createdAt DESC")
    List<Order> findByTeacherIdOrderByCreatedAtDesc(@Param("teacherId") String teacherId);

    @Query("SELECT o FROM Order o WHERE o.course.teacher.id = :teacherId AND o.status = 'PAID' ORDER BY o.paidAt DESC")
    List<Order> findPaidOrdersByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT COALESCE(SUM(o.amount), 0) FROM Order o WHERE o.course.teacher.id = :teacherId AND o.status = 'PAID'")
    BigDecimal sumRevenueByTeacherId(@Param("teacherId") String teacherId);

    /** Tổng phí nền tảng đã thu trên các đơn PAID của giảng viên. */
    @Query("SELECT COALESCE(SUM(o.platformFee), 0) FROM Order o " +
           "WHERE o.course.teacher.id = :teacherId AND o.status = 'PAID'")
    BigDecimal sumPlatformFeeByTeacherId(@Param("teacherId") String teacherId);

    @Query("SELECT COALESCE(SUM(o.amount), 0) FROM Order o WHERE o.course.id = :courseId AND o.status = 'PAID'")
    BigDecimal sumRevenueByCourseId(@Param("courseId") String courseId);

    @Query("SELECT COALESCE(SUM(o.amount), 0) FROM Order o WHERE o.status = 'PAID'")
    BigDecimal sumTotalPaidRevenue();

    long countByStatus(String status);
}
