# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Subsurface Web" - a modern dive log application with React frontend and Go backend. The project aims to create a more user-friendly version of Subsurface dive logging software with modern UI/UX patterns.

## Architecture

- **Monorepo structure** using `apps/` for applications and `packages/` for shared code
- **Frontend**: React + TypeScript + Vite app in `apps/frontend/`
- **Backend**: Go + Gin API server in `apps/backend/` with PostgreSQL 17 database
- **Database**: PostgreSQL 17 running in Docker with comprehensive schema
- **State Management**: Zustand stores for client state, API integration for persistence
- **UI Framework**: ShadCN UI components with Tailwind CSS v4
- **Maps**: OpenStreetMap with Leaflet (replaced Google Maps for cost/licensing)
- **Data Import**: UDDF (Universal Dive Data Format) file import support

## Development Commands

### Frontend (apps/frontend/)
```bash
bun dev              # Start development server
bun run build        # Build for production (runs tsc -b && vite build)  
bun run lint         # Run ESLint
bun run preview      # Preview production build
```

### Backend (apps/backend/)
```bash
docker-compose up -d # Start PostgreSQL 17 database
go mod tidy         # Install Go dependencies
go run main.go      # Start Go API server on :8080
```

### Database
```bash
# PostgreSQL runs on localhost:5432
# Database: subsurface, User: dev, Password: devpass
# Schema initialized automatically via init.sql
```

## Key Files and Patterns

### State Management
- `src/store/diveStore.ts` - Zustand store for dive data with CRUD operations and UDDF import
- `src/store/settingsStore.ts` - Zustand store for user settings with localStorage persistence (being migrated to API)
- Store pattern: `create<StateInterface>((set) => ({ state, actions }))`

### Data Models
- `src/lib/dives.ts` - Core Dive interface and mock data
- `src/lib/settings.ts` - User settings types and defaults
- `src/lib/uddfParser.ts` - UDDF file parser for dive computer data import
- `src/lib/unitConversions.ts` - Unit conversion utilities (meters/feet, celsius/fahrenheit, etc.)
- Dive model includes: id, date, location, depth, duration, buddy, lat/lng coordinates

### Component Structure
- `src/components/ui/` - ShadCN UI components (button, card, dialog, tabs, etc.)
- `src/pages/` - Page components (DiveLog, AddDive, EditDive, Map, Settings)
- `src/components/Layout.tsx` - Main layout wrapper with navigation
- `src/components/DashboardStats.tsx` - Statistics cards with unit-aware formatting
- `src/components/DiveDetailModal.tsx` - Detailed dive view modal with tabs
- `src/components/UDDFImport.tsx` - File import component with drag/drop
- `src/components/DiveChart.tsx` - Chart.js visualizations

### Routing and Navigation
- Uses React Router DOM for navigation
- Routes: `/` (dashboard), `/add`, `/edit/:id`, `/map`, `/settings`
- Layout component provides consistent navigation header

## Tech Stack Details

### Frontend
- **Build Tool**: Vite with TypeScript
- **Styling**: Tailwind CSS v4 with custom configuration
- **UI Components**: ShadCN UI with Radix primitives
- **Forms**: React Hook Form + Zod validation
- **State Management**: Zustand with persistence middleware
- **Maps**: Leaflet.js with react-leaflet (OpenStreetMap tiles)
- **Charts**: Chart.js with react-chartjs-2
- **File Parsing**: fast-xml-parser for UDDF import
- **Icons**: Lucide React
- **Package Manager**: Bun

### Backend
- **Language**: Go 1.21+
- **Framework**: Gin HTTP framework
- **Database**: PostgreSQL 17 with proper constraints
- **Database Driver**: lib/pq
- **Environment**: godotenv for configuration
- **CORS**: Built-in middleware for frontend integration

### Infrastructure
- **Database**: Docker Compose for PostgreSQL 17
- **API**: RESTful endpoints at `/api/v1/`
- **Development**: Hot reload for both frontend and backend

## Important Development Guidelines

### Library Documentation
- **ALWAYS use context7 MCP when looking up library documentation or API references**
- This includes React, Gin, PostgreSQL, Leaflet, Chart.js, and any other libraries
- Use `claude mcp` command to verify context7 is available before searching for docs

### Database Schema
- All measurements stored in metric (meters, celsius) in database
- Unit conversions handled in frontend based on user settings
- User settings stored in PostgreSQL with proper constraints
- Default development user (ID: 1) for testing

### UDDF Import System
- Supports standard UDDF files from dive computers and Subsurface
- Parses dive sites, coordinates, depth, duration, and buddy information
- Handles duration conversion (seconds → minutes) and validates data
- Preview/confirmation flow before importing

### Settings Architecture
- Frontend: Zustand store with localStorage (transitioning to API)
- Backend: PostgreSQL storage with user_settings table
- Supports: units, preferences, and diving-specific settings
- Real-time unit conversion throughout UI