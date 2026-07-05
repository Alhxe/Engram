--liquibase formatted sql

--changeset alex.perez:013-01-node-template
ALTER TABLE node ADD COLUMN is_template INTEGER NOT NULL DEFAULT 0;
--rollback ALTER TABLE node DROP COLUMN is_template;
