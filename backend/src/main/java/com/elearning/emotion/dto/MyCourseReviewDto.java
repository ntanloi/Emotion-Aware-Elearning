package com.elearning.emotion.dto;

/**
 * Trạng thái đánh giá của CHÍNH người đang đăng nhập đối với 1 khóa học (Phase 0/1):
 * - enrolled=false -> FE chỉ cho xem review, không hiện form đánh giá.
 * - canReview=false -> FE hiện thông báo lý do (chưa đạt tiến độ 20%, hoặc GV/Admin không được tự đánh giá).
 * - progress -> % tiến độ học tập hiện tại.
 * - requiredProgress -> % tiến độ yêu cầu để mở đánh giá (20%).
 * - review != null -> học viên đã đánh giá rồi, có thể sửa (PUT) hoặc xóa mềm (DELETE).
 */
public record MyCourseReviewDto(
        boolean enrolled,
        boolean canReview,
        int progress,
        int requiredProgress,
        CourseReviewDto review,
        String reason
) {
    public MyCourseReviewDto(boolean enrolled, CourseReviewDto review) {
        this(enrolled, enrolled, 0, 20, review, null);
    }
}
