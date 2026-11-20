package com.elearning.emotion.repository;

import com.elearning.emotion.dto.UserAuthInfo;
import com.elearning.emotion.entity.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmail(String email);
    Optional<User> findByTeacherCode(String teacherCode);
    List<User> findByRoleOrderByCreatedAtAsc(String role);
    boolean existsByEmail(String email);
    boolean existsByRole(String role);
    long countByRole(String role);
    long countByRoleAndStatus(String role, String status);

    /**
     * B4: Lấy nhanh trạng thái và tokenVersion để xác thực phiên JWT với bộ nhớ đệm
     */
    @Query("SELECT new com.elearning.emotion.dto.UserAuthInfo(u.status, COALESCE(u.tokenVersion, 0)) FROM User u WHERE u.id = :id")
    Optional<UserAuthInfo> findAuthInfoById(@Param("id") String id);

    /**
     * H-a: Khóa bi quan hàng User khi thực hiện các tác vụ tài chính ví và rút tiền đồng thời
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.id = :id")
    Optional<User> findByIdWithLock(@Param("id") String id);
}
