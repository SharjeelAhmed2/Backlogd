-- Titles imported from MyAnimeList that AniList doesn't know about keep their MAL id.
ALTER TABLE media DROP CONSTRAINT media_source_check;
ALTER TABLE media ADD CONSTRAINT media_source_check CHECK (source IN ('TMDB', 'ANILIST', 'MAL', 'MANUAL'));

-- External accounts a user has linked (MAL username, later Steam id...).
CREATE TABLE connections (
    id             UUID PRIMARY KEY,
    user_id        UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    provider       VARCHAR(20)  NOT NULL CHECK (provider IN ('MAL', 'STEAM', 'LETTERBOXD')),
    account        VARCHAR(100) NOT NULL,
    last_synced_at TIMESTAMPTZ,
    last_summary   VARCHAR(300),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ux_connections_user_provider UNIQUE (user_id, provider)
);
