--liquibase formatted sql

--changeset alex.perez:017-01-webhook
CREATE TABLE webhook (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES app_user (id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    enabled    INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);
--rollback DROP TABLE webhook;
