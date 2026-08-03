package utils

import (
	"fmt"
	"strings"
)

// ValidationErrors maps JSON field paths to user-facing validation messages.
type ValidationErrors map[string]string

// Add records the first validation error for a field.
func (e ValidationErrors) Add(field, message string) {
	if _, exists := e[field]; !exists {
		e[field] = message
	}
}

// Merge adds validation errors below a parent JSON field path.
func (e ValidationErrors) Merge(prefix string, other ValidationErrors) {
	for field, message := range other {
		path := field
		if prefix != "" {
			if strings.HasPrefix(field, "[") {
				path = prefix + field
			} else if field != "" {
				path = prefix + "." + field
			} else {
				path = prefix
			}
		}
		e.Add(path, message)
	}
}

// RequireString validates a required string and its maximum length.
func RequireString(errors ValidationErrors, field, value string, maxLength int) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		errors.Add(field, "is required")
		return
	}
	if len([]rune(value)) > maxLength {
		errors.Add(field, fmt.Sprintf("must be at most %d characters", maxLength))
	}
}

// OptionalString validates the maximum length of an optional string.
func OptionalString(errors ValidationErrors, field string, value *string, maxLength int) {
	if value != nil && len([]rune(*value)) > maxLength {
		errors.Add(field, fmt.Sprintf("must be at most %d characters", maxLength))
	}
}

// OneOf validates that a value is one of the allowed strings.
func OneOf(errors ValidationErrors, field, value string, allowed ...string) {
	for _, candidate := range allowed {
		if value == candidate {
			return
		}
	}
	errors.Add(field, "must be one of: "+strings.Join(allowed, ", "))
}

// OptionalOneOf validates an optional string against an allowed set.
func OptionalOneOf(errors ValidationErrors, field string, value *string, allowed ...string) {
	if value != nil {
		OneOf(errors, field, *value, allowed...)
	}
}

// FloatRange validates an inclusive floating-point range.
func FloatRange(errors ValidationErrors, field string, value, minimum, maximum float64) {
	if value < minimum || value > maximum {
		errors.Add(field, fmt.Sprintf("must be between %g and %g", minimum, maximum))
	}
}

// IntRange validates an inclusive integer range.
func IntRange(errors ValidationErrors, field string, value, minimum, maximum int) {
	if value < minimum || value > maximum {
		errors.Add(field, fmt.Sprintf("must be between %d and %d", minimum, maximum))
	}
}
