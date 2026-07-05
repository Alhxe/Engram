--liquibase formatted sql

--changeset alex.perez:003-01-mind-map-table
-- A mind map lives under a parent node (a page), or at the root (null).
CREATE TABLE mind_map (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    parent_node_id TEXT REFERENCES node (id) ON DELETE CASCADE,
    created_at     TEXT NOT NULL
);
CREATE INDEX idx_mind_map_parent ON mind_map (parent_node_id);
--rollback DROP TABLE mind_map;

--changeset alex.perez:003-02-map-placement-table
-- A node placed on a mind map at (x, y). The node stays the single source of
-- truth; a placement is only its position on one canvas, so the same node can
-- appear on several maps. Edges are the global links between placed nodes.
CREATE TABLE map_placement (
    id      TEXT PRIMARY KEY,
    map_id  TEXT NOT NULL REFERENCES mind_map (id) ON DELETE CASCADE,
    node_id TEXT NOT NULL REFERENCES node (id) ON DELETE CASCADE,
    x       REAL NOT NULL DEFAULT 0,
    y       REAL NOT NULL DEFAULT 0,
    UNIQUE (map_id, node_id)
);
CREATE INDEX idx_map_placement_map ON map_placement (map_id);
--rollback DROP TABLE map_placement;
