-- ============================================================
-- E-Learning + AI Emotion Recognition — initial schema
-- MySQL 8. UUID stored as CHAR(36). Run automatically by Flyway.
-- ============================================================

CREATE TABLE users (
    id              CHAR(36) PRIMARY KEY,
    full_name       VARCHAR(150)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    role            VARCHAR(20)   NOT NULL, -- STUDENT | TEACHER | ADMIN
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id              CHAR(36) PRIMARY KEY,
    teacher_id      CHAR(36) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    level           VARCHAR(30),
    duration_hours  INT,
    status          VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT | PUBLISHED | HIDDEN
    CONSTRAINT fk_courses_teacher FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE lessons (
    id              CHAR(36) PRIMARY KEY,
    course_id       CHAR(36) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    video_url       VARCHAR(500),
    order_index     INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_lessons_course FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE enrollments (
    id                CHAR(36) PRIMARY KEY,
    user_id           CHAR(36) NOT NULL,
    course_id         CHAR(36) NOT NULL,
    enrolled_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    progress_percent  FLOAT NOT NULL DEFAULT 0,
    CONSTRAINT fk_enroll_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_enroll_course FOREIGN KEY (course_id) REFERENCES courses(id),
    UNIQUE KEY uq_enrollment (user_id, course_id)
);

CREATE TABLE quizzes (
    id          CHAR(36) PRIMARY KEY,
    lesson_id   CHAR(36) NOT NULL,
    title       VARCHAR(200) NOT NULL,
    CONSTRAINT fk_quiz_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE questions (
    id           CHAR(36) PRIMARY KEY,
    quiz_id      CHAR(36) NOT NULL,
    content      TEXT NOT NULL,
    order_index  INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_question_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id)
);

CREATE TABLE answer_options (
    id           CHAR(36) PRIMARY KEY,
    question_id  CHAR(36) NOT NULL,
    content      VARCHAR(500) NOT NULL,
    is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_option_question FOREIGN KEY (question_id) REFERENCES questions(id)
);

CREATE TABLE quiz_results (
    id            CHAR(36) PRIMARY KEY,
    quiz_id       CHAR(36) NOT NULL,
    user_id       CHAR(36) NOT NULL,
    score         FLOAT NOT NULL,
    submitted_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_result_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
    CONSTRAINT fk_result_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE learning_sessions (
    id                      CHAR(36) PRIMARY KEY,
    user_id                 CHAR(36) NOT NULL,
    lesson_id               CHAR(36) NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'WAITING', -- WAITING|LEARNING|PAUSED|FINISHED|ABANDONED
    has_camera_permission   BOOLEAN NOT NULL DEFAULT FALSE,
    start_time              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time                DATETIME NULL,
    focus_score             FLOAT NULL,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_session_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

-- Registry of emotion-recognition model versions (face-api.js legacy + custom trained models)
CREATE TABLE ai_models (
    id                   CHAR(36) PRIMARY KEY,
    version              VARCHAR(100) NOT NULL UNIQUE,
    framework            VARCHAR(50),
    dataset_trained_on   VARCHAR(200),
    accuracy_test        FLOAT,
    is_active            BOOLEAN NOT NULL DEFAULT FALSE,
    deployed_at          DATETIME NULL,
    notes                TEXT
);

CREATE TABLE emotion_logs (
    id                CHAR(36) PRIMARY KEY,
    session_id        CHAR(36) NOT NULL,
    model_id          CHAR(36) NULL,
    captured_at       DATETIME NOT NULL,
    emotion_label     VARCHAR(20) NOT NULL, -- neutral|happy|sad|angry|fearful|disgusted|surprised|no_face
    confidence_score  FLOAT NOT NULL,
    raw_scores        JSON NULL,
    CONSTRAINT fk_emotion_session FOREIGN KEY (session_id) REFERENCES learning_sessions(id),
    CONSTRAINT fk_emotion_model FOREIGN KEY (model_id) REFERENCES ai_models(id),
    INDEX idx_emotion_session (session_id)
);

CREATE TABLE adaptive_suggestions (
    id                    CHAR(36) PRIMARY KEY,
    session_id            CHAR(36) NOT NULL,
    trigger_type          VARCHAR(50) NOT NULL,
    video_segment_start   INT NOT NULL,
    video_segment_end     INT NOT NULL,
    triggered_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    was_accepted          BOOLEAN NULL,
    CONSTRAINT fk_suggestion_session FOREIGN KEY (session_id) REFERENCES learning_sessions(id)
);

CREATE TABLE daily_reports (
    id               CHAR(36) PRIMARY KEY,
    user_id          CHAR(36) NOT NULL,
    report_date      DATE NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'CHUA_TAO', -- CHUA_TAO|DA_TAO|DA_XEM
    emotion_summary  TEXT,
    ai_advice_text   TEXT,
    CONSTRAINT fk_report_user FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uq_daily_report (user_id, report_date)
);

CREATE TABLE lesson_feedback (
    id                       CHAR(36) PRIMARY KEY,
    lesson_id                CHAR(36) NOT NULL,
    weak_time_segment        VARCHAR(100),
    improvement_suggestion   TEXT,
    avg_focus_score          FLOAT,
    CONSTRAINT fk_feedback_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE chat_conversations (
    id           CHAR(36) PRIMARY KEY,
    user_id      CHAR(36) NOT NULL,
    started_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_conv_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE chat_messages (
    id                CHAR(36) PRIMARY KEY,
    conversation_id   CHAR(36) NOT NULL,
    sender            VARCHAR(20) NOT NULL, -- USER | BOT
    content           TEXT NOT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id)
);

-- Seed: register legacy face-api.js as a "model" so old-style logs stay consistent
INSERT INTO ai_models (id, version, framework, dataset_trained_on, accuracy_test, is_active, deployed_at, notes)
VALUES (UUID(), 'face-api.js-tinyFaceDetector', 'tensorflow.js', 'pretrained (not trained by team)', NULL, FALSE, NOW(),
        'Thu vien co san dung o ban dau, khong tu train. Giu lai de tuong thich nguoc.');
