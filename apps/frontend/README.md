# Dive Log Frontend

React and TypeScript frontend for Subsurface Web, built with Vite, Tailwind CSS, Zustand, Leaflet, and Chart.js.

## Start the local development server

### Prerequisites

- [Bun](https://bun.sh/)
- The backend running at `http://localhost:8080`; see [the backend README](../backend/README.md)

From this directory:

```bash
bun install
bun dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

The frontend currently sends API requests to `http://localhost:8080/api/v1` and uses development user ID `1`.

## Useful commands

```bash
bun dev          # Start the Vite development server
bun run lint     # Run ESLint
bun run build    # Type-check and create a production build
bun run preview  # Preview the production build locally
```

## Main source areas

- `src/pages/` — routed application pages
- `src/components/` — dive features and reusable UI components
- `src/store/` — Zustand state stores
- `src/lib/api.ts` — REST API client
- `src/lib/diveImportParser.ts` — content-based import detection and routing
- `src/lib/uddfParser.ts`, `src/lib/subsurfaceXmlParser.ts`, and the Subsurface CSV parsers — format-specific import logic
