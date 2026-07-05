--liquibase formatted sql

--changeset alex.perez:007-01-node-property-table
-- Typed key/value properties on a node (schema-less), enabling database-like
-- collection views over a page's children. The value is serialized as text.
CREATE TABLE node_property (
    id      TEXT PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES node (id) ON DELETE CASCADE,
    name    TEXT NOT NULL,
    type    TEXT NOT NULL DEFAULT 'TEXT',
    value   TEXT,
    UNIQUE (node_id, name)
);
CREATE INDEX idx_node_property_node ON node_property (node_id);
--rollback DROP TABLE node_property;
