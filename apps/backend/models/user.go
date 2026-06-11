package models

import "time"

// User represents an application user
type User struct {
	ID           int       `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	Username     string    `json:"username" db:"username"`
	PasswordHash string    `json:"-" db:"password_hash"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3,max=100"`
	Password string `json:"password" binding:"required,min=8,max=72"`
}

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// AuthResponse is returned on successful registration, login, or refresh
type AuthResponse struct {
	AccessToken string `json:"access_token"`
	User        *User  `json:"user"`
}
