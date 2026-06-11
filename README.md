// File: README.md (Project Overview)

# Subsurface Web (Modern Dive Log)

A modern, web-based version of Subsurface focused on usability, accessibility, and sync support.

## Quick Start (Docker)

Requires Docker and Docker Compose.

```bash
cp .env.example .env   # set JWT_SECRET (e.g. `openssl rand -base64 32`)
docker compose up --build
```

This starts PostgreSQL, the Go API (`http://localhost:8080`), and the
frontend (`http://localhost:5173`). The backend applies database migrations
automatically on startup and, outside of `GIN_MODE=release`, seeds a
development account (`dev@example.com` / `devpass123`).

For local development without Docker, see `apps/backend/README.md` and
`apps/frontend/README.md`.

## Tech Stack

### Frontend
- **Framework**: React
- **Styling**: Tailwind CSS
- **UI Components**: ShadCN UI (based on Radix UI)
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Chart.js
- **Maps**: Leaflet.js
- **Offline Support**: IndexedDB via localForage

### Backend
- **Framework**: Node.js + Express
- **Database**: PostgreSQL (with PostGIS)
- **Auth**: Supabase Auth or Auth0
- **API**: REST with Express Routers

### Deployment
- **Frontend**: Vercel
- **Backend**: Fly.io
- **Database**: Supabase (managed Postgres)

## Folder Structure

```
subsurface-web/
├── apps/
│   ├── frontend/               # React + Tailwind app
│   └── backend/                # Node.js Express API
├── packages/
│   ├── ui/                     # Shared components
│   ├── hooks/                  # Shared React hooks
│   └── utils/                  # Shared utilities
├── .github/
│   └── workflows/ci.yml       # GitHub Actions CI/CD
├── docker/
│   ├── backend.Dockerfile
│   └── compose.yaml
├── README.md
└── package.json
```

## Features
- Dive log CRUD
- Dive profile uploads and visualization
- GPS mapping of dive sites
- Offline mode with sync queue
- OAuth login with dive computer integrations (planned)
