# Subsurface Web (Modern Dive Log)

A modern web dive log focused on usability, dive-computer imports, interactive profiles, mapping, and unit-aware data display.

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, ShadCN/Radix UI, Zustand, Leaflet, and Chart.js
- **Backend:** Go 1.25+, Gin, and PostgreSQL 18
- **Local infrastructure:** Docker Compose for PostgreSQL

## Local development

### Prerequisites

- [Bun](https://bun.sh/)
- Go 1.25 or newer
- Docker with Docker Compose

### 1. Start the backend and database

From the repository root:

```bash
cd apps/backend
docker compose up -d
go mod download
go run .
```

The API starts at `http://localhost:8080`. Verify it with:

```bash
curl http://localhost:8080/health
```

PostgreSQL is initialized automatically with a development user and sample settings. The default local connection is `postgres://dev:devpass@localhost:5432/subsurface?sslmode=disable`.

If an existing `postgres_data` volume was created by PostgreSQL 17, migrate it
with a dump/restore or `pg_upgrade` before starting PostgreSQL 18. Disposable
local data can instead be recreated with `docker compose down -v`.

### 2. Start the frontend

In a second terminal, from the repository root:

```bash
cd apps/frontend
bun install
bun dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

To point the frontend at a backend on another origin, set `VITE_API_ORIGIN`
(for example, `VITE_API_ORIGIN=http://localhost:8081 bun dev`).

### 3. Stop local services

Stop the frontend and backend with `Ctrl+C`, then stop PostgreSQL:

```bash
cd apps/backend
docker compose down
```

Database data remains in the `postgres_data` Docker volume. Use `docker compose down -v` only when you intentionally want to delete local database data.

## Quality checks

```bash
# Backend
cd apps/backend
go test ./...

# Frontend
cd apps/frontend
bun run lint
bun run build
```

## Repository structure

```text
.
├── apps/
│   ├── backend/     # Go/Gin REST API and PostgreSQL schema
│   └── frontend/    # React/TypeScript Vite application
├── testdata/        # Sample import files
├── SUBSURFACE_FEATURES.md
└── README.md
```

## Current features

- Dive log CRUD and duplicate detection
- UDDF, native Subsurface XML/SSRF, summary/profile CSV, and dive-site XML imports
- Lossless JSON backup/restore and spreadsheet CSV export for all or filtered dives
- Interactive dive-profile charts
- Dive-site management and Leaflet maps
- Reusable tags, trip grouping/management, and independent dive numbering
- Equipment and gas-mix tracking
- User unit and display preferences
- Light, dark, and system themes with a persisted device preference
