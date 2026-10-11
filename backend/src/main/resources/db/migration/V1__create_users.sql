CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(255) NOT NULL,
    username      VARCHAR(30)  NOT NULL,
    display_name  VARCHAR(60)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_users_email    ON users (lower(email));
CREATE UNIQUE INDEX ux_users_username ON users (lower(username));
