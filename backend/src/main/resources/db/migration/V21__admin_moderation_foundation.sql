-- V21: Admin foundation, khoa hoc kiem duyet, danh gia AI va nhat ky danh gia
ALTER TABLE users
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN status_reason VARCHAR(500) NULL,
  ADD COLUMN token_version INT NOT NULL DEFAULT 0,
  ADD COLUMN last_login_at DATETIME NULL,
  ADD COLUMN deleted_at DATETIME NULL,
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_users_role_status ON users (role, status);

ALTER TABLE courses
  ADD COLUMN submitted_at DATETIME NULL,
  ADD COLUMN reviewed_at DATETIME NULL,
  ADD COLUMN reviewed_by CHAR(36) NULL,
  ADD COLUMN reject_reason TEXT NULL,
  ADD COLUMN content_changed_at DATETIME NULL,
  ADD COLUMN ai_moderation_report JSON NULL,
  ADD CONSTRAINT fk_courses_reviewer FOREIGN KEY (reviewed_by) REFERENCES users (id);

CREATE INDEX idx_courses_status ON courses (status, submitted_at);

CREATE TABLE course_review_logs (
  id CHAR(36) PRIMARY KEY,
  course_id CHAR(36) NOT NULL,
  actor_id CHAR(36) NOT NULL,
  action VARCHAR(20) NOT NULL,        -- SUBMIT, APPROVE, REJECT, SUSPEND, RESTORE
  from_status VARCHAR(20) NULL,
  to_status VARCHAR(20) NOT NULL,
  note TEXT NULL,
  checklist JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_crl_course (course_id, created_at),
  CONSTRAINT fk_crl_course FOREIGN KEY (course_id) REFERENCES courses (id),
  CONSTRAINT fk_crl_actor FOREIGN KEY (actor_id) REFERENCES users (id)
);

CREATE TABLE audit_logs (
  id CHAR(36) PRIMARY KEY,
  actor_id CHAR(36) NOT NULL,
  action VARCHAR(50) NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  target_id CHAR(36) NULL,
  detail JSON NULL,
  ip VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_actor (actor_id, created_at),
  INDEX idx_audit_target (target_type, target_id)
);
