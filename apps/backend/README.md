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

   On startup the server applies any pending database migrations
   automatically (see `migrations/`). Outside of `GIN_MODE=release` it also
   seeds a development account (`dev@example.com` / `devpass123`).

## API Endpoints

- `GET /health` - Health check
- `POST /api/v1/auth/register` - Create an account
- `POST /api/v1/auth/login` - Log in (sets a refresh token cookie)
- `POST /api/v1/auth/refresh` - Exchange the refresh token cookie for a new access token
- `POST /api/v1/auth/logout` - Revoke the refresh token
- `GET /api/v1/auth/me` - Current user (requires `Authorization: Bearer <token>`)
- `GET/PUT /api/v1/settings` - User settings (authenticated)
- `GET/POST /api/v1/dives`, `PUT/DELETE /api/v1/dives/:id` - Dives (authenticated)
- `GET /api/v1/dive-sites` - Dive sites (reads are public, writes are authenticated)

## Environment Variables

See `.env.example` for the full list:

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8080)
- `GIN_MODE` - Gin mode (`debug` or `release`)
- `JWT_SECRET` - Secret used to sign access tokens (required when `GIN_MODE=release`)
- `CORS_ORIGIN` - Frontend origin allowed for CORS and the refresh cookie

## Database Schema

Schema changes live in `migrations/` as ordered golang-migrate SQL files and
are applied automatically when the server starts. The schema includes:
- `users` - User accounts (with bcrypt password hashes)
- `refresh_tokens` - Hashed JWT refresh tokens
- `user_settings` - User preferences and settings
- `dive_sites` - Dive site locations
- `dives` - Individual dive records

Settings are stored with proper constraints and defaults matching the frontend TypeScript types.