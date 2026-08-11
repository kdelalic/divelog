# Dive Log Backend

Go/Gin REST API for Subsurface Web with PostgreSQL storage.

## Start the local development server

### Prerequisites

- Go 1.25 or newer
- Docker with Docker Compose

From this directory:

```bash
docker compose up -d
go mod download
go run .
```

The API listens on `http://localhost:8080`. Confirm the server and database are healthy:

```bash
curl http://localhost:8080/health
```

The Compose service starts PostgreSQL 18 on `localhost:5432` and initializes the schema from `init.sql`. The default development connection is:

```text
postgres://dev:devpass@localhost:5432/subsurface?sslmode=disable
```

PostgreSQL major versions cannot reuse each other's data directory directly. If
your `postgres_data` volume was created by PostgreSQL 17, dump and restore it or
run `pg_upgrade` before starting PostgreSQL 18. For disposable local data, reset
the volume with `docker compose down -v` and let Compose initialize a new one.

Stop PostgreSQL without deleting its data:

```bash
docker compose down
```

Use `docker compose down -v` only when you intentionally want to reset the local database.

## Configuration

The server optionally reads a `.env` file in this directory.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Local Compose database | PostgreSQL connection URL |
| `PORT` | `8080` | HTTP server port |
| `GIN_MODE` | Gin default | Set to `release` for release mode |
| `DB_MAX_OPEN_CONNS` | `25` | Maximum open database connections |
| `DB_MAX_IDLE_CONNS` | `5` | Maximum idle database connections |
| `DB_CONN_MAX_LIFETIME_MINUTES` | `5` | Maximum connection lifetime |
| `DB_CONN_MAX_IDLE_MINUTES` | `5` | Maximum connection idle time |

Example:

```bash
DATABASE_URL='postgres://dev:devpass@localhost:5432/subsurface?sslmode=disable' go run .
```

## API routes

- `GET /health`
- `GET|POST /api/v1/dives?user_id=1`
- `POST /api/v1/dives/batch?user_id=1`
- `POST /api/v1/dives/renumber?user_id=1`
- `PUT|DELETE /api/v1/dives/:id?user_id=1`
- `GET|POST /api/v1/tags?user_id=1`
- `PUT|DELETE /api/v1/tags/:id?user_id=1`
- `GET|POST /api/v1/trips?user_id=1`
- `PUT|DELETE /api/v1/trips/:id?user_id=1`
- `POST /api/v1/trips/:id/merge|split?user_id=1`
- `GET|POST /api/v1/dive-sites`
- `GET|PUT /api/v1/settings?user_id=1`

Authentication is not implemented yet; local development uses the seeded user ID `1`.

## Tests

```bash
go test ./...
```

Repository integration tests are skipped until a dedicated test database is configured.
