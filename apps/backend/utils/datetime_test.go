package utils

import (
	"testing"
	"time"
)

func TestParseDateTimeWithVariousFormats(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "ISO 8601 with milliseconds",
			input:    "2023-12-25T14:30:45.123",
			expected: "2023-12-25T14:30:45.123",
		},
		{
			name:     "ISO 8601 standard",
			input:    "2023-12-25T14:30:45",
			expected: "2023-12-25T14:30:45",
		},
		{
			name:     "Date only",
			input:    "2023-12-25",
			expected: "2023-12-25T00:00:00",
		},
		{
			name:     "With Z suffix",
			input:    "2023-12-25T14:30:45Z",
			expected: "2023-12-25T14:30:45",
		},
		{
			name:     "With timezone offset",
			input:    "2023-12-25T14:30:45+00:00",
			expected: "2023-12-25T14:30:45",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ParseDateTime(tt.input)

			// Try different layouts for parsing expected result
			layouts := []string{
				"2006-01-02T15:04:05.000",
				"2006-01-02T15:04:05",
			}

			var expected time.Time
			var err error
			for _, layout := range layouts {
				expected, err = time.Parse(layout, tt.expected)
				if err == nil {
					break
				}
			}

			if err != nil {
				t.Fatalf("Failed to parse expected time %s: %v", tt.expected, err)
			}

			if !result.Equal(expected) {
				t.Errorf("ParseDateTime(%s) = %v, want %v", tt.input, result, expected)
			}
		})
	}
}

func TestParseDateTimeInvalidFormat(t *testing.T) {
	result := ParseDateTime("invalid-date")
	if !result.IsZero() {
		t.Errorf("ParseDateTime with invalid input should return zero time, got %v", result)
	}
}

func TestParseDateTimeStrictInvalidFormat(t *testing.T) {
	result, err := ParseDateTimeStrict("invalid-date")
	if err == nil {
		t.Fatal("ParseDateTimeStrict should reject invalid input")
	}
	if !result.IsZero() {
		t.Errorf("ParseDateTimeStrict with invalid input should return zero time, got %v", result)
	}
}
