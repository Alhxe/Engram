--liquibase formatted sql

--changeset alex.perez:021-01-link-rel-type
ALTER TABLE link ADD COLUMN rel_type TEXT;
--rollback ALTER TABLE link DROP COLUMN rel_type;
