--liquibase formatted sql

--changeset alex.perez:014-01-ai-usage
CREATE TABLE ai_usage (
    id            TEXT PRIMARY KEY,
    user_id       TEXT NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    task          TEXT NOT NULL,
    provider      TEXT NOT NULL,
    model         TEXT NOT NULL,
    input_tokens  INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL
);
--rollback DROP TABLE ai_usage;
