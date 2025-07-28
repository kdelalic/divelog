package utils

import "errors"

// Common validation errors
var (
	ErrMissingUserID = errors.New("user_id is required")
	ErrInvalidUserID = errors.New("invalid user_id")
	ErrInvalidID     = errors.New("invalid ID")
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
