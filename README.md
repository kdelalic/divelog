// File: README.md (Project Overview)

# Subsurface Web (Modern Dive Log)

A modern, web-based version of Subsurface focused on usability, accessibility, and sync support.

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
