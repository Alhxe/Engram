--liquibase formatted sql

--changeset alex.perez:006-01-app-user-table
CREATE TABLE app_user (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    email         TEXT,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'USER',
    created_at    TEXT NOT NULL
);
--rollback DROP TABLE app_user;

--changeset alex.perez:006-02-api-key-ownership
-- API keys become user-owned and can carry an optional expiry (null = never).
ALTER TABLE api_key ADD COLUMN user_id TEXT REFERENCES app_user (id) ON DELETE CASCADE;
--rollback ALTER TABLE api_key DROP COLUMN user_id;

--changeset alex.perez:006-03-api-key-expiry
ALTER TABLE api_key ADD COLUMN expires_at TEXT;
--rollback ALTER TABLE api_key DROP COLUMN expires_at;
