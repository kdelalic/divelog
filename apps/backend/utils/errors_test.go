package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestErrorConstants(t *testing.T) {
	tests := []struct {
		err     error
		message string
	}{
		{ErrMissingUserID, "user_id is required"},
		{ErrInvalidUserID, "invalid user_id"},
		{ErrInvalidID, "invalid ID"},
		{ErrDiveNotFound, "dive not found"},
		{ErrDiveSiteNotFound, "dive site not found"},
		{ErrDuplicateDive, "duplicate dive exists"},
		{ErrDuplicateDiveSite, "duplicate dive site exists"},
		{ErrDiveSiteInUse, "dive site is referenced by one or more dives"},
		{ErrDatabaseError, "database error"},
		{ErrInvalidInput, "invalid input data"},
		{ErrProcessingFailed, "processing failed"},
	}

	for _, test := range tests {
		assert.EqualError(t, test.err, test.message)
	}
}

func TestErrorsAreDistinct(t *testing.T) {
	assert.NotEqual(t, ErrDiveNotFound, ErrDiveSiteNotFound)
	assert.NotEqual(t, ErrMissingUserID, ErrInvalidUserID)
}
