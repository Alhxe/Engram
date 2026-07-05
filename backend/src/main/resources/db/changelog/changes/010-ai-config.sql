--liquibase formatted sql

--changeset alex.perez:010-01-ai-credential
CREATE TABLE ai_credential (
    id                TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    provider          TEXT NOT NULL,
    api_key_encrypted TEXT NOT NULL,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    UNIQUE (user_id, provider)
);
--rollback DROP TABLE ai_credential;

--changeset alex.perez:010-02-ai-task-model
CREATE TABLE ai_task_model (
    id       TEXT PRIMARY KEY,
    user_id  TEXT NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    task     TEXT NOT NULL,
    provider TEXT NOT NULL,
    model    TEXT NOT NULL,
    enabled  INTEGER NOT NULL DEFAULT 1,
    UNIQUE (user_id, task)
);
--rollback DROP TABLE ai_task_model;
