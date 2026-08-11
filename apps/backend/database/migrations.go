package database

import (
	"context"
	"database/sql"
	"fmt"
)

// RunMigrations applies the small, idempotent schema migrations that are
// required when an existing Docker volume outlives init.sql. PostgreSQL only
// executes init.sql for a brand-new data directory.
func RunMigrations(ctx context.Context, db *sql.DB) error {
	const migration = `
		CREATE TABLE IF NOT EXISTS trips (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			location VARCHAR(255),
			start_date DATE,
			end_date DATE,
			notes TEXT,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
		);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_trips_user_name ON trips(user_id, lower(name));

		CREATE TABLE IF NOT EXISTS tags (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(100) NOT NULL,
			created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
		);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, lower(name));

		ALTER TABLE dives ADD COLUMN IF NOT EXISTS dive_number INTEGER;
		ALTER TABLE dives ADD COLUMN IF NOT EXISTS trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL;
		CREATE INDEX IF NOT EXISTS idx_dives_trip_id ON dives(trip_id);
		CREATE INDEX IF NOT EXISTS idx_dives_user_number ON dives(user_id, dive_number);

		CREATE TABLE IF NOT EXISTS dive_tags (
			dive_id INTEGER NOT NULL REFERENCES dives(id) ON DELETE CASCADE,
			tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
			PRIMARY KEY (dive_id, tag_id)
		);
		CREATE INDEX IF NOT EXISTS idx_dive_tags_tag_id ON dive_tags(tag_id);

		WITH numbered AS (
			SELECT d.id,
			       COALESCE((SELECT MAX(existing.dive_number) FROM dives existing WHERE existing.user_id = d.user_id), 0)
			       + ROW_NUMBER() OVER (PARTITION BY d.user_id ORDER BY d.dive_datetime, d.id)::INTEGER AS number
			FROM dives d WHERE d.dive_number IS NULL
		)
		UPDATE dives d SET dive_number = numbered.number FROM numbered WHERE d.id = numbered.id;
	`
	if _, err := db.ExecContext(ctx, migration); err != nil {
		return fmt.Errorf("apply logbook organization migration: %w", err)
	}
	return nil
}
