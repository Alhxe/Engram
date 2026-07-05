--liquibase formatted sql

--changeset alex.perez:011-01-node-deleted-at
ALTER TABLE node ADD COLUMN deleted_at TEXT;
--rollback ALTER TABLE node DROP COLUMN deleted_at;

--changeset alex.perez:011-02-node-import-id
ALTER TABLE node ADD COLUMN import_id TEXT;
--rollback ALTER TABLE node DROP COLUMN import_id;
