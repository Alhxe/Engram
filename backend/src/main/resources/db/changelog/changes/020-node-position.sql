--liquibase formatted sql

--changeset alex.perez:020-01-node-position
ALTER TABLE node ADD COLUMN position INTEGER DEFAULT 0;
--rollback ALTER TABLE node DROP COLUMN position;
