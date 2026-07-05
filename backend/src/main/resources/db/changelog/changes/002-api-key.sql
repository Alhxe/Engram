--liquibase formatted sql

--changeset alex.perez:002-01-api-key-table
CREATE TABLE api_key (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    key_hash     TEXT NOT NULL UNIQUE,
    scope        TEXT NOT NULL DEFAULT 'READ',
    created_at   TEXT NOT NULL,
    last_used_at TEXT,
    revoked      INTEGER NOT NULL DEFAULT 0
);
--rollback DROP TABLE api_key;
