--liquibase formatted sql

--changeset alex.perez:015-01-node-revision
CREATE TABLE node_revision (
    id         TEXT PRIMARY KEY,
    node_id    TEXT NOT NULL REFERENCES node (id) ON DELETE CASCADE,
    title      TEXT,
    content    TEXT,
    created_at TEXT NOT NULL
);
--rollback DROP TABLE node_revision;

--changeset alex.perez:015-02-node-revision-index
CREATE INDEX idx_node_revision_node ON node_revision (node_id, created_at);
--rollback DROP INDEX idx_node_revision_node;
