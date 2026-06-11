package utils

import "errors"

// Common validation errors
var (
	ErrInvalidID = errors.New("invalid ID")
)

// Database errors
var (
	ErrDiveNotFound     = errors.New("dive not found")
	ErrDiveSiteNotFound = errors.New("dive site not found")
	ErrDuplicateDive    = errors.New("duplicate dive exists")
	ErrDatabaseError    = errors.New("database error")
)

// Business logic errors
var (
	ErrInvalidInput     = errors.New("invalid input data")
	ErrProcessingFailed = errors.New("processing failed")
)

// Authentication errors
var (
	ErrUserNotFound        = errors.New("user not found")
	ErrUserAlreadyExists   = errors.New("user already exists")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
)
