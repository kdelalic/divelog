package utils

import (
	"errors"
	"strings"
	"time"
)

// ParseDateTimeStrict parses the timestamp formats accepted by the dive API.
func ParseDateTimeStrict(dateTimeStr string) (time.Time, error) {
	dateTimeStr = strings.TrimSpace(dateTimeStr)
	if dateTimeStr == "" {
		return time.Time{}, errors.New("datetime is required")
	}

	layouts := []string{
		time.RFC3339Nano,
		"2006-01-02T15:04:05.000",
		"2006-01-02T15:04:05",
		"2006-01-02",
	}

	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, dateTimeStr); err == nil {
			return parsed, nil
		}
	}

	return time.Time{}, errors.New("datetime must be an ISO 8601 date or timestamp")
}

// ParseDateTime converts ISO 8601 string to time.Time without timezone handling
func ParseDateTime(dateTimeStr string) time.Time {
	parsed, _ := ParseDateTimeStrict(dateTimeStr)
	return parsed
}
