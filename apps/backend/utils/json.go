package utils

import (
	"encoding/json"
	"log"
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
		log.Printf("Error unmarshaling JSON: %v", err)
		return err
	}

	return nil
}
