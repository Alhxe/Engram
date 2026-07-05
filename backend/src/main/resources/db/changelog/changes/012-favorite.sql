--liquibase formatted sql

--changeset alex.perez:012-01-node-favorite
ALTER TABLE node ADD COLUMN favorite INTEGER NOT NULL DEFAULT 0;
--rollback ALTER TABLE node DROP COLUMN favorite;
