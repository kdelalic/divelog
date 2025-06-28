# Dive Log Backend

Go backend service for the dive log application with PostgreSQL storage.

## Setup

1. **Start PostgreSQL**:
   ```bash
   docker-compose up -d
   ```

2. **Install Go dependencies**:
   ```bash
   go mod tidy
   ```

3. **Run the backend**:
   ```bash
   go run main.go
   ```

## API Endpoints

- `GET /health` - Health check
- `GET /api/v1/settings?user_id=1` - Get user settings
- `PUT /api/v1/settings?user_id=1` - Update user settings

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8080)
- `GIN_MODE` - Gin mode (development/release)

## Database Schema

The database includes tables for:
- `users` - User accounts
- `user_settings` - User preferences and settings
- `dive_sites` - Dive site locations
- `dives` - Individual dive records

Settings are stored with proper constraints and defaults matching the frontend TypeScript types.