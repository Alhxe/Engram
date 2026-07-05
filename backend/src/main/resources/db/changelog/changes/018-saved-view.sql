--liquibase formatted sql

--changeset alex.perez:018-01-saved-view
CREATE TABLE saved_view (
    id          TEXT PRIMARY KEY,
    node_id     TEXT NOT NULL REFERENCES node (id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    mode        TEXT,
    group_by    TEXT,
    date_by     TEXT,
    sort_col    TEXT,
    sort_dir    INTEGER NOT NULL DEFAULT 1,
    filter_text TEXT
);
--rollback DROP TABLE saved_view;
