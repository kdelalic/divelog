package utils

import (
	"context"
	"encoding/json"
)

// MarshalJSON safely marshals data to JSON, returning nil for empty data
func MarshalJSON(data interface{}) ([]byte, error) {
	if data == nil {
		return nil, nil
	}

	return json.Marshal(data)
}

// UnmarshalJSON safely unmarshals JSON data into target
func UnmarshalJSON(data []byte, target interface{}) error {
	if len(data) == 0 {
		return nil
	}

	if err := json.Unmarshal(data, target); err != nil {
		// Note: We can't access request context here, so using background context
		LogError(context.Background(), "Error unmarshaling JSON", err)
		return err
	}

	return nil
}
