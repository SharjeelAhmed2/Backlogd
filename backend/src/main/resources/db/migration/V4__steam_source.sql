-- Games imported from a Steam library keep their Steam app id.
ALTER TABLE media DROP CONSTRAINT media_source_check;
ALTER TABLE media ADD CONSTRAINT media_source_check CHECK (source IN ('TMDB', 'ANILIST', 'MAL', 'STEAM', 'MANUAL'));

-- Friendly name for a linked account (e.g. Steam persona) when the account id isn't readable.
ALTER TABLE connections ADD COLUMN display_name VARCHAR(100);
