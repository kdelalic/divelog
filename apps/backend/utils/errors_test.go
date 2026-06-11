package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestErrorConstants(t *testing.T) {
	// Test that error constants are not nil and have meaningful messages
	assert.NotNil(t, ErrInvalidID)
	assert.NotNil(t, ErrUserNotFound)
	assert.NotNil(t, ErrUserAlreadyExists)
	assert.NotNil(t, ErrInvalidCredentials)
	assert.NotNil(t, ErrInvalidRefreshToken)
	assert.NotNil(t, ErrDiveNotFound)
	assert.NotNil(t, ErrDiveSiteNotFound)
	assert.NotNil(t, ErrDuplicateDive)
	assert.NotNil(t, ErrDatabaseError)
	assert.NotNil(t, ErrInvalidInput)
	assert.NotNil(t, ErrProcessingFailed)

	// Test error messages
	assert.Contains(t, ErrDiveNotFound.Error(), "dive")
	assert.Contains(t, ErrDiveSiteNotFound.Error(), "dive site")
	assert.Contains(t, ErrInvalidInput.Error(), "input")
	assert.Contains(t, ErrDuplicateDive.Error(), "duplicate")
	assert.Contains(t, ErrDatabaseError.Error(), "database")
	assert.Contains(t, ErrProcessingFailed.Error(), "processing")
}

func TestErrorEquality(t *testing.T) {
	// Test that error constants can be compared
	assert.Equal(t, ErrDiveNotFound, ErrDiveNotFound)
	assert.NotEqual(t, ErrDiveNotFound, ErrDiveSiteNotFound)
	assert.NotEqual(t, ErrUserNotFound, ErrUserAlreadyExists)
}

func TestErrorStringRepresentation(t *testing.T) {
	// Test specific error messages
	assert.Equal(t, "dive not found", ErrDiveNotFound.Error())
	assert.Equal(t, "dive site not found", ErrDiveSiteNotFound.Error())
	assert.Equal(t, "invalid input data", ErrInvalidInput.Error())
	assert.Equal(t, "duplicate dive exists", ErrDuplicateDive.Error())
	assert.Equal(t, "database error", ErrDatabaseError.Error())
	assert.Equal(t, "processing failed", ErrProcessingFailed.Error())
}
