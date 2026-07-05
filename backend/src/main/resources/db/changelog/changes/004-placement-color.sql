--liquibase formatted sql

--changeset alex.perez:004-01-placement-color
ALTER TABLE map_placement ADD COLUMN color TEXT;
--rollback ALTER TABLE map_placement DROP COLUMN color;
