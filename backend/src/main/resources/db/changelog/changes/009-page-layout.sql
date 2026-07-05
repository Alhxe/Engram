--liquibase formatted sql

--changeset alex.perez:009-01-node-layout
-- A page's primary layout: DOCUMENT (rich text) or a view over its children
-- (MINDMAP / TABLE / BOARD / CALENDAR).
ALTER TABLE node ADD COLUMN layout TEXT NOT NULL DEFAULT 'DOCUMENT';
--rollback ALTER TABLE node DROP COLUMN layout;
