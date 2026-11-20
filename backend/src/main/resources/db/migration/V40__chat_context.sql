ALTER TABLE chat_conversations ADD COLUMN context_type VARCHAR(20) NOT NULL DEFAULT 'COURSE_ADVICE';
ALTER TABLE chat_conversations ADD COLUMN context_ref_id CHAR(36) NULL;
ALTER TABLE chat_conversations ADD COLUMN title VARCHAR(200) NULL;

ALTER TABLE chat_messages ADD COLUMN model VARCHAR(60) NULL;
ALTER TABLE chat_messages ADD COLUMN prompt_tokens INT NULL;
ALTER TABLE chat_messages ADD COLUMN completion_tokens INT NULL;
ALTER TABLE chat_messages ADD COLUMN feedback TINYINT NULL;

CREATE INDEX idx_chat_msg_conv_created ON chat_messages (conversation_id, created_at);
CREATE INDEX idx_chat_conv_user ON chat_conversations (user_id, started_at);