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
	ErrDiveNotFound          = errors.New("dive not found")
	ErrDiveSiteNotFound      = errors.New("dive site not found")
	ErrDuplicateDive         = errors.New("duplicate dive exists")
	ErrDuplicateDiveSite     = errors.New("duplicate dive site exists")
	ErrDiveSiteInUse         = errors.New("dive site is referenced by one or more dives")
	ErrTripNotFound          = errors.New("trip not found")
	ErrTagNotFound           = errors.New("tag not found")
	ErrOrganizationConflict  = errors.New("logbook organization name already exists")
	ErrBulkOperationNotFound = errors.New("bulk operation not found")
	ErrBulkOperationUndone   = errors.New("bulk operation was already undone")
	ErrTimestampConflict     = errors.New("timestamp change would create a duplicate dive")
	ErrDatabaseError         = errors.New("database error")
)

// Business logic errors
var (
	ErrInvalidInput     = errors.New("invalid input data")
	ErrProcessingFailed = errors.New("processing failed")
)
