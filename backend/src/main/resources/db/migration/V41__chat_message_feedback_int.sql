-- V41: Sua kieu du lieu cot feedback trong chat_messages tu TINYINT sang INT.
-- Ly do: entity ChatMessage.feedback la Integer (Java) -> Hibernate schema-validation
-- mong doi cot SQL kieu INTEGER, trong khi V40 tao TINYINT.
ALTER TABLE chat_messages MODIFY COLUMN feedback INT NULL;
