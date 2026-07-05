--liquibase formatted sql

--changeset alex.perez:023-01-ai-credential-base-url
ALTER TABLE ai_credential ADD COLUMN base_url TEXT;
--rollback ALTER TABLE ai_credential DROP COLUMN base_url;
