-- V36: TOEIC Test Library (Nen tang du lieu De thi cong khai va Luot lam bai de thi)

CREATE TABLE toeic_tests (
    id                CHAR(36) PRIMARY KEY,
    source            VARCHAR(20) NOT NULL DEFAULT 'COURSE', -- COURSE | SYSTEM | COMMUNITY
    author_id         CHAR(36) NOT NULL,
    course_id         CHAR(36) NULL,                         -- NULL neu la de cong khai doc lap
    title             VARCHAR(200) NOT NULL,
    description       TEXT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'DRAFT',  -- DRAFT | PENDING_REVIEW | PUBLISHED | REJECTED | HIDDEN
    origin_test_id    CHAR(36) NULL,                         -- De goc khi sao chep snapshot hoac phien ban moi
    version           INT NOT NULL DEFAULT 1,
    listening_minutes INT NOT NULL DEFAULT 45,
    reading_minutes   INT NOT NULL DEFAULT 75,
    attempt_count     INT NOT NULL DEFAULT 0,
    published_at      DATETIME NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tt_author FOREIGN KEY (author_id) REFERENCES users (id),
    CONSTRAINT fk_tt_course FOREIGN KEY (course_id) REFERENCES courses (id) ON DELETE SET NULL,
    CONSTRAINT fk_tt_origin FOREIGN KEY (origin_test_id) REFERENCES toeic_tests (id) ON DELETE SET NULL,
    INDEX idx_tt_status_source (status, source),
    INDEX idx_tt_author (author_id),
    INDEX idx_tt_course (course_id)
);

CREATE TABLE toeic_test_parts (
    id              CHAR(36) PRIMARY KEY,
    test_id         CHAR(36) NOT NULL,
    part_no         INT NOT NULL,                           -- 1 den 7
    content_item_id CHAR(36) NOT NULL,
    question_count  INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_ttp_test FOREIGN KEY (test_id) REFERENCES toeic_tests (id) ON DELETE CASCADE,
    CONSTRAINT fk_ttp_item FOREIGN KEY (content_item_id) REFERENCES content_items (id) ON DELETE CASCADE,
    INDEX idx_ttp_test_part (test_id, part_no),
    INDEX idx_ttp_item (content_item_id)
);

CREATE TABLE test_attempts (
    id                   CHAR(36) PRIMARY KEY,
    user_id              CHAR(36) NOT NULL,
    test_id              CHAR(36) NOT NULL,
    mode                 VARCHAR(20) NOT NULL DEFAULT 'FULL',       -- FULL | PRACTICE
    selected_parts       VARCHAR(50) NULL,                          -- vd: "PART1,PART2,PART5"
    feedback_mode        VARCHAR(20) NOT NULL DEFAULT 'AFTER_TEST', -- IMMEDIATE | AFTER_TEST
    time_limit_seconds   INT NOT NULL DEFAULT 7200,                 -- 0 neu khong gioi han
    started_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deadline_at          DATETIME NULL,
    submitted_at         DATETIME NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',-- IN_PROGRESS | COMPLETED | TIMED_OUT | ABANDONED
    score_listening      INT NULL,
    score_reading        INT NULL,
    score_total          INT NULL,
    raw_listening_correct INT NULL,
    raw_reading_correct   INT NULL,
    total_questions      INT NULL,
    total_correct        INT NULL,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ta_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_ta_test FOREIGN KEY (test_id) REFERENCES toeic_tests (id) ON DELETE CASCADE,
    INDEX idx_ta_user_test (user_id, test_id),
    INDEX idx_ta_status (status)
);

ALTER TABLE attempts
    ADD COLUMN test_attempt_id CHAR(36) NULL,
    ADD CONSTRAINT fk_attempts_test_attempt FOREIGN KEY (test_attempt_id) REFERENCES test_attempts (id) ON DELETE SET NULL,
    ADD INDEX idx_attempts_test_attempt (test_attempt_id);
