# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "Subsurface Web" - a modern dive log application with React frontend and Go backend. The project aims to create a more user-friendly version of Subsurface dive logging software with modern UI/UX patterns.

## Architecture

- **Maps**: OpenStreetMap with Leaflet (replaced Google Maps for cost/licensing)

## Development Commands

### Frontend (apps/frontend/)
```bash
# Coverage must run under Node, not Bun - Bun's runtime does not implement the
# node:inspector coverage API that @vitest/coverage-v8 depends on.
npx vitest run --coverage
```

### Frontend Testing
- The suite runs with `TZ=Pacific/Kiritimati` (UTC+14) on purpose: dive times are
  wall-clock times at the dive site, so an accidental UTC conversion shifts the
  date and fails a test instead of passing by luck on a UTC machine

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

### Dive Import System
- Detects formats from file contents instead of relying only on extensions
- Parses dive sites, coordinates, depth, duration, and buddy information
- Handles duration conversion (seconds → minutes) and validates data
- Preview/confirmation flow before importing

### Settings Architecture
- Frontend: Zustand store with localStorage (transitioning to API)
- Backend: PostgreSQL storage with user_settings table
- Supports: units, preferences, and diving-specific settings
- Real-time unit conversion throughout UI
