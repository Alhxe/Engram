--liquibase formatted sql

--changeset alex.perez:001-core-tables
-- Everything is a node. A node may have a parent node, so any page can contain
-- pages (Notion-style nesting); a root page has parent_id = NULL.
CREATE TABLE tag (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
);

CREATE TABLE node (
    id         TEXT PRIMARY KEY,
    title      TEXT NOT NULL,
    content    TEXT,
    kind       TEXT NOT NULL DEFAULT 'NOTE',
    parent_id  TEXT REFERENCES node (id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
CREATE INDEX idx_node_parent ON node (parent_id);

CREATE TABLE node_tag (
    node_id TEXT NOT NULL REFERENCES node (id) ON DELETE CASCADE,
    tag_id  TEXT NOT NULL REFERENCES tag (id) ON DELETE CASCADE,
    PRIMARY KEY (node_id, tag_id)
);
CREATE INDEX idx_node_tag_tag ON node_tag (tag_id);

CREATE TABLE link (
    id         TEXT PRIMARY KEY,
    source_id  TEXT NOT NULL REFERENCES node (id) ON DELETE CASCADE,
    target_id  TEXT NOT NULL REFERENCES node (id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE (source_id, target_id)
);
CREATE INDEX idx_link_source ON link (source_id);
CREATE INDEX idx_link_target ON link (target_id);
--rollback DROP TABLE link; DROP TABLE node_tag; DROP TABLE node; DROP TABLE tag;

--changeset alex.perez:002-fts5-index
-- Standalone FTS5 table (not external-content) because node's primary key is a
-- UUID, not an integer rowid. It stores node_id UNINDEXED so search returns the
-- UUID directly, and is kept in sync by the triggers below.
CREATE VIRTUAL TABLE node_fts USING fts5 (
    node_id UNINDEXED,
    title,
    content
);
--rollback DROP TABLE node_fts;

-- One trigger per changeset: the SQLite JDBC driver executes only the first
-- statement of a batched string, so batching several CREATE TRIGGER together
-- would silently create only one.

--changeset alex.perez:003-fts5-trigger-insert splitStatements:false
CREATE TRIGGER node_fts_ai AFTER INSERT ON node BEGIN
    INSERT INTO node_fts (node_id, title, content) VALUES (new.id, new.title, new.content);
END;
--rollback DROP TRIGGER node_fts_ai;

--changeset alex.perez:004-fts5-trigger-update splitStatements:false
CREATE TRIGGER node_fts_au AFTER UPDATE ON node BEGIN
    UPDATE node_fts SET title = new.title, content = new.content WHERE node_id = new.id;
END;
--rollback DROP TRIGGER node_fts_au;

--changeset alex.perez:005-fts5-trigger-delete splitStatements:false
CREATE TRIGGER node_fts_ad AFTER DELETE ON node BEGIN
    DELETE FROM node_fts WHERE node_id = old.id;
END;
--rollback DROP TRIGGER node_fts_ad;
