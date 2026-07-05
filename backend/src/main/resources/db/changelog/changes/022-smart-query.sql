--liquibase formatted sql

--changeset alex.perez:022-01-node-smart-query
ALTER TABLE node ADD COLUMN smart_query TEXT;
--rollback ALTER TABLE node DROP COLUMN smart_query;
