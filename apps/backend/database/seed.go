package database

import "fmt"

// devUserPasswordHash is the bcrypt hash for the password "devpass123".
const devUserPasswordHash = "$2a$12$Y03dq4mcKIXsHAVxPup0ceJ0XduasSx33byBef33UVYzcjjSMgWXG"

// SeedDevUser ensures a development account (dev@example.com / devpass123)
// and its default settings exist. It is idempotent and intended for local
// development only.
func SeedDevUser() error {
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	if _, err := DB.Exec(`
		INSERT INTO users (email, username, password_hash)
		VALUES ('dev@example.com', 'developer', $1)
		ON CONFLICT (email) DO NOTHING
	`, devUserPasswordHash); err != nil {
		return fmt.Errorf("failed to seed dev user: %w", err)
	}

	if _, err := DB.Exec(`
		INSERT INTO user_settings (user_id)
		SELECT id FROM users WHERE email = 'dev@example.com'
		ON CONFLICT (user_id) DO NOTHING
	`); err != nil {
		return fmt.Errorf("failed to seed dev user settings: %w", err)
	}

	return nil
}
