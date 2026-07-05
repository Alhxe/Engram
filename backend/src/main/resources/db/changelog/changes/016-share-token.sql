--liquibase formatted sql

--changeset alex.perez:016-01-node-share-token
ALTER TABLE node ADD COLUMN share_token TEXT;
--rollback ALTER TABLE node DROP COLUMN share_token;
