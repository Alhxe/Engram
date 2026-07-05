--liquibase formatted sql

--changeset alex.perez:019-01-node-collection-schema
ALTER TABLE node ADD COLUMN collection_schema TEXT;
--rollback ALTER TABLE node DROP COLUMN collection_schema;
