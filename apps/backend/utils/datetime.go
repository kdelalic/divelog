package utils

import (
	"strings"
	"time"
)

// ParseDateTime converts ISO 8601 string to time.Time without timezone handling
func ParseDateTime(dateTimeStr string) time.Time {
	// Strip timezone suffix if present (e.g., "Z" or "+00:00")
	dateTimeStr = strings.TrimSuffix(dateTimeStr, "Z")

	// Try parsing as timestamp without timezone (2006-01-02T15:04:05 or 2006-01-02T15:04:05.000)
	layouts := []string{
		"2006-01-02T15:04:05.000",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}

	for _, layout := range layouts {
		if t, err := time.Parse(layout, dateTimeStr); err == nil {
			return t
		}
	}

	// Last resort: current time
	return time.Now()
}
