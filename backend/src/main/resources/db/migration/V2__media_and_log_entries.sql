-- A title from any source. Shared between users; external titles are cached once per source id.
CREATE TABLE media (
    id           UUID PRIMARY KEY,
    kind         VARCHAR(10)   NOT NULL CHECK (kind IN ('FILM', 'ANIME', 'GAME')),
    source       VARCHAR(10)   NOT NULL CHECK (source IN ('TMDB', 'ANILIST', 'MANUAL')),
    external_id  VARCHAR(64),
    title        VARCHAR(300)  NOT NULL,
    release_year INT,
    poster_url   VARCHAR(1000),
    backdrop_url VARCHAR(1000),
    overview     VARCHAR(4000),
    episodes     INT,
    genres       VARCHAR(500),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_media_source_external ON media (source, external_id) WHERE external_id IS NOT NULL;

-- One user's log of one title.
CREATE TABLE log_entries (
    id          UUID PRIMARY KEY,
    user_id     UUID          NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    media_id    UUID          NOT NULL REFERENCES media (id),
    status      VARCHAR(20)   NOT NULL CHECK (status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED', 'DROPPED')),
    rating      NUMERIC(2, 1) CHECK (rating BETWEEN 0.5 AND 5),
    platform    VARCHAR(20)   CHECK (platform IN ('PLAYSTATION', 'XBOX', 'PC', 'NINTENDO', 'MOBILE', 'OTHER')),
    console     VARCHAR(40),
    progress    INT           CHECK (progress >= 0),
    hours       NUMERIC(7, 1) CHECK (hours >= 0),
    started_on  DATE,
    finished_on DATE,
    notes       VARCHAR(4000),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ux_log_user_media UNIQUE (user_id, media_id)
);

CREATE INDEX ix_log_entries_user_updated ON log_entries (user_id, updated_at DESC);
