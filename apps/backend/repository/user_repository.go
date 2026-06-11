package repository

import (
	"context"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
	"errors"
	"time"

	"github.com/lib/pq"
)

type UserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// CreateUser inserts a new user and returns it with its assigned ID
func (r *UserRepository) CreateUser(ctx context.Context, email, username, passwordHash string) (*models.User, error) {
	user := &models.User{
		Email:        email,
		Username:     username,
		PasswordHash: passwordHash,
	}

	query := `
		INSERT INTO users (email, username, password_hash)
		VALUES ($1, $2, $3)
		RETURNING id, created_at, updated_at`

	err := r.db.QueryRowContext(ctx, query, email, username, passwordHash).
		Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		var pqErr *pq.Error
		if errors.As(err, &pqErr) && pqErr.Code == "23505" { // unique_violation
			return nil, utils.ErrUserAlreadyExists
		}
		return nil, err
	}

	return user, nil
}

// GetUserByEmail retrieves a user by email address
func (r *UserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	var passwordHash sql.NullString

	query := `
		SELECT id, email, username, password_hash, created_at, updated_at
		FROM users WHERE email = $1`

	err := r.db.QueryRowContext(ctx, query, email).
		Scan(&user.ID, &user.Email, &user.Username, &passwordHash, &user.CreatedAt, &user.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, utils.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	user.PasswordHash = passwordHash.String
	return user, nil
}

// GetUserByID retrieves a user by ID
func (r *UserRepository) GetUserByID(ctx context.Context, id int) (*models.User, error) {
	user := &models.User{}
	var passwordHash sql.NullString

	query := `
		SELECT id, email, username, password_hash, created_at, updated_at
		FROM users WHERE id = $1`

	err := r.db.QueryRowContext(ctx, query, id).
		Scan(&user.ID, &user.Email, &user.Username, &passwordHash, &user.CreatedAt, &user.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, utils.ErrUserNotFound
	}
	if err != nil {
		return nil, err
	}

	user.PasswordHash = passwordHash.String
	return user, nil
}

// StoreRefreshToken persists the hash of a refresh token
func (r *UserRepository) StoreRefreshToken(ctx context.Context, userID int, tokenHash string, expiresAt time.Time) error {
	query := `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES ($1, $2, $3)`

	_, err := r.db.ExecContext(ctx, query, userID, tokenHash, expiresAt)
	return err
}

// GetUserIDByRefreshToken returns the user a valid (unexpired, unrevoked) refresh token belongs to
func (r *UserRepository) GetUserIDByRefreshToken(ctx context.Context, tokenHash string) (int, error) {
	var userID int

	query := `
		SELECT user_id FROM refresh_tokens
		WHERE token_hash = $1 AND NOT revoked AND expires_at > NOW()`

	err := r.db.QueryRowContext(ctx, query, tokenHash).Scan(&userID)
	if err == sql.ErrNoRows {
		return 0, utils.ErrInvalidRefreshToken
	}
	if err != nil {
		return 0, err
	}

	return userID, nil
}

// RevokeRefreshToken marks a refresh token as revoked
func (r *UserRepository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	_, err := r.db.ExecContext(ctx, `UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1`, tokenHash)
	return err
}
