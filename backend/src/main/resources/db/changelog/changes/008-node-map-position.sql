--liquibase formatted sql

-- A node's position and color on its parent page's mind-map canvas.
-- One ALTER per changeset: the SQLite JDBC driver runs only the first
-- statement of a batched string.

--changeset alex.perez:008-01-node-map-x
ALTER TABLE node ADD COLUMN map_x REAL;
--rollback ALTER TABLE node DROP COLUMN map_x;

--changeset alex.perez:008-02-node-map-y
ALTER TABLE node ADD COLUMN map_y REAL;
--rollback ALTER TABLE node DROP COLUMN map_y;

--changeset alex.perez:008-03-node-map-color
ALTER TABLE node ADD COLUMN map_color TEXT;
--rollback ALTER TABLE node DROP COLUMN map_color;
