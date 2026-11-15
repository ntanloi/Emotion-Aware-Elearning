-- ============================================================
-- V32: He thong kiem duyet khoa hoc TOEIC toan dien (Phase AG-1)
-- Tao cac bang: course_policies, grammar_topics, moderation_lexicon,
-- moderation_runs, moderation_issues, moderation_issue_decisions,
-- content_analysis_cache; Bo sung cot profile, kind, topic_code.
-- ============================================================

-- 1. Bo sung cot tren cac bang hien co
ALTER TABLE courses
    ADD COLUMN profile VARCHAR(12) NOT NULL DEFAULT 'FULL';

ALTER TABLE content_groups
    ADD COLUMN kind VARCHAR(10) NOT NULL DEFAULT 'LESSON',
    ADD COLUMN topic_code VARCHAR(40) NULL;

ALTER TABLE content_items
    ADD COLUMN topic_code VARCHAR(40) NULL;

-- 2. Bang chinh sach kiem duyet (course_policies)
CREATE TABLE course_policies (
    id         CHAR(36) PRIMARY KEY,
    version    INT NOT NULL,
    config     JSON NOT NULL,
    active     TINYINT(1) NOT NULL DEFAULT 0,
    created_by CHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cp_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_policy_version (version),
    INDEX idx_cp_active (active)
);

-- 3. Bang danh muc chu diem ngu phap (grammar_topics)
CREATE TABLE grammar_topics (
    code           VARCHAR(40) PRIMARY KEY,
    title_vi       VARCHAR(120) NOT NULL,
    description_vi TEXT NULL,
    keywords_en    JSON NULL,
    keywords_vi    JSON NULL,
    good_example   VARCHAR(300) NULL,
    bad_example    VARCHAR(300) NULL,
    sort_order     INT NOT NULL DEFAULT 0,
    reviewed       TINYINT(1) NOT NULL DEFAULT 0,
    INDEX idx_gt_sort (sort_order)
);

-- 4. Bang tu dien tu khoa kiem duyet (moderation_lexicon)
CREATE TABLE moderation_lexicon (
    id         CHAR(36) PRIMARY KEY,
    category   VARCHAR(30) NOT NULL,        -- PROFANITY_VI, SCAM_AD, SCORE_GUARANTEE, etc.
    match_type VARCHAR(8) NOT NULL,         -- WORD | PHRASE | REGEX
    pattern    VARCHAR(200) NOT NULL,
    severity   VARCHAR(8) NOT NULL,         -- ERROR | WARNING | INFO | CONTEXT
    lang       VARCHAR(3) NOT NULL DEFAULT 'vi',
    scope      VARCHAR(20) NOT NULL DEFAULT 'ALL', -- ALL | TITLE_DESC | BODY | QUESTION
    active     TINYINT(1) NOT NULL DEFAULT 1,
    note       VARCHAR(255) NULL,
    UNIQUE KEY uq_lex (category, match_type, pattern),
    INDEX idx_lex_cat_active (category, active)
);

-- 5. Bang phien kiem duyet khoa hoc (moderation_runs)
CREATE TABLE moderation_runs (
    id                 CHAR(36) PRIMARY KEY,
    course_id          CHAR(36) NOT NULL,
    submitted_at       DATETIME NOT NULL,
    policy_version     INT NOT NULL,
    lexicon_version    VARCHAR(40) NULL,
    content_hash       CHAR(64) NOT NULL,
    status             VARCHAR(20) NOT NULL, -- SUBMITTED | ANALYZING | READY_FOR_REVIEW | DECIDED | FAILED
    risk_score         INT NOT NULL DEFAULT 0,
    risk_level         VARCHAR(6) NULL,      -- LOW | MEDIUM | HIGH
    readiness_snapshot JSON NULL,
    finished_at        DATETIME NULL,
    CONSTRAINT fk_mr_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_mr_course (course_id, submitted_at),
    INDEX idx_mr_status (status)
);

-- 6. Bang danh sach loi nghi ngo phat hien boi luat / cong cu / AI (moderation_issues)
CREATE TABLE moderation_issues (
    id             CHAR(36) PRIMARY KEY,
    run_id         CHAR(36) NOT NULL,
    issue_key      CHAR(64) NOT NULL,
    rule_id        VARCHAR(20) NOT NULL,
    category       VARCHAR(20) NOT NULL, -- STRUCTURE | CONTENT | LANGUAGE | SAFETY | SECURITY | COPYRIGHT | SYSTEM
    severity       VARCHAR(8) NOT NULL,  -- BLOCKER | ERROR | WARNING | INFO | CONTEXT
    source         VARCHAR(5) NOT NULL,  -- RULE | TOOL | LLM
    target_type    VARCHAR(20) NOT NULL, -- COURSE | SECTION | GROUP | ITEM | QUESTION | PASSAGE | VOCAB_WORD | MEDIA
    target_id      CHAR(36) NULL,
    message        VARCHAR(500) NOT NULL,
    suggestion     VARCHAR(500) NULL,
    evidence       VARCHAR(500) NULL,
    confidence     FLOAT NULL,
    model          VARCHAR(60) NULL,
    prompt_version VARCHAR(20) NULL,
    CONSTRAINT fk_mi_run FOREIGN KEY (run_id) REFERENCES moderation_runs(id) ON DELETE CASCADE,
    INDEX idx_mi_run (run_id),
    INDEX idx_mi_key (issue_key),
    INDEX idx_mi_rule (rule_id)
);

-- 7. Bang quyet dinh cua kiem duyet vien tren tung loi (moderation_issue_decisions)
CREATE TABLE moderation_issue_decisions (
    id           CHAR(36) PRIMARY KEY,
    course_id    CHAR(36) NOT NULL,
    issue_key    CHAR(64) NOT NULL,
    content_hash CHAR(64) NOT NULL,
    decision     VARCHAR(8) NOT NULL,  -- ACCEPT | DISMISS | NEED_FIX
    note         VARCHAR(500) NULL,
    decided_by   CHAR(36) NOT NULL,
    decided_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mid_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_mid_decided_by FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_decision (course_id, issue_key),
    INDEX idx_mid_course_decision (course_id, decision)
);

-- 8. Bang bo nho dem ket qua phan tich noi dung (content_analysis_cache)
CREATE TABLE content_analysis_cache (
    content_hash   CHAR(64) NOT NULL,
    rule_id        VARCHAR(20) NOT NULL,
    prompt_version VARCHAR(20) NOT NULL,
    model          VARCHAR(60) NOT NULL,
    result         JSON NOT NULL,
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (content_hash, rule_id, prompt_version, model)
);
