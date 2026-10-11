# Backlogd

One log for every film, anime and game: Letterboxd, MyAnimeList, Steam, and manual entries for consoles.

| Folder | Stack |
|---|---|
| `backend/` | Spring Boot 4 · Java 21 · PostgreSQL · Flyway · Spring Security (JWT) |
| `frontend/` | React 19 · Vite 6 · TypeScript · Tailwind CSS 4 · React Router · TanStack Query · Motion |

## First-time setup

1. **Database credentials.** Open `backend/.env` and fill in `DB_USERNAME` and `DB_PASSWORD` for your local PostgreSQL.
   The app connects to the `postgres` database (change `DB_NAME` to use another) and creates its tables
   inside a `backlogd` schema automatically on first start.
2. **Frontend packages.** `cd frontend && npm install` (already done on this machine).

## Run

Backend (http://localhost:8080):

```bash
cd backend
./mvnw spring-boot:run
```

Frontend (http://localhost:5173), in a second terminal:

```bash
cd frontend
npm run dev
```

The Vite dev server forwards `/api/*` to the backend, so open http://localhost:5173.

## API so far

| Method | Path | Auth | |
|---|---|---|---|
| POST | `/api/auth/register` | – | `{email, username, displayName?, password}` → `{token, user}` |
| POST | `/api/auth/login` | – | `{email, password}` → `{token, user}` |
| GET | `/api/me` | Bearer token | Current user |

## Secrets

`backend/.env` is git-ignored. `backend/.env.example` lists the keys and is safe to commit.
