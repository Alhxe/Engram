--liquibase formatted sql

--changeset alex.perez:005-01-attachment-table
-- Binary files are stored on the filesystem; only their metadata and storage
-- path live in the database, keeping it small and fast.
CREATE TABLE attachment (
    id           TEXT PRIMARY KEY,
    node_id      TEXT NOT NULL REFERENCES node (id) ON DELETE CASCADE,
    filename     TEXT NOT NULL,
    content_type TEXT,
    size_bytes   INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    created_at   TEXT NOT NULL
);
CREATE INDEX idx_attachment_node ON attachment (node_id);
--rollback DROP TABLE attachment;
