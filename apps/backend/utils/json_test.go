package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestMarshalJSON_WithData(t *testing.T) {
	data := map[string]interface{}{
		"name":  "Test Dive",
		"depth": 30.5,
		"duration": 45,
	}
	
	result, err := MarshalJSON(data)
	
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Contains(t, string(result), "Test Dive")
	assert.Contains(t, string(result), "30.5")
}

func TestMarshalJSON_WithNilData(t *testing.T) {
	result, err := MarshalJSON(nil)
	
	assert.NoError(t, err)
	assert.Nil(t, result)
}

func TestMarshalJSON_WithEmptyStruct(t *testing.T) {
	data := struct{}{}
	
	result, err := MarshalJSON(data)
	
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "{}", string(result))
}

func TestMarshalJSON_WithSlice(t *testing.T) {
	data := []string{"dive1", "dive2", "dive3"}
	
	result, err := MarshalJSON(data)
	
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Contains(t, string(result), "dive1")
	assert.Contains(t, string(result), "dive2")
	assert.Contains(t, string(result), "dive3")
}

func TestUnmarshalJSON_WithValidData(t *testing.T) {
	jsonData := []byte(`{"name": "Test Dive", "depth": 30.5}`)
	var target map[string]interface{}
	
	err := UnmarshalJSON(jsonData, &target)
	
	assert.NoError(t, err)
	assert.Equal(t, "Test Dive", target["name"])
	assert.Equal(t, 30.5, target["depth"])
}

func TestUnmarshalJSON_WithEmptyData(t *testing.T) {
	var target map[string]interface{}
	
	err := UnmarshalJSON([]byte{}, &target)
	
	assert.NoError(t, err)
	assert.Nil(t, target)
}

func TestUnmarshalJSON_WithInvalidJSON(t *testing.T) {
	invalidJSON := []byte(`{"name": invalid json}`)
	var target map[string]interface{}
	
	err := UnmarshalJSON(invalidJSON, &target)
	
	assert.Error(t, err)
	assert.Nil(t, target)
}

func TestUnmarshalJSON_WithNilTarget(t *testing.T) {
	jsonData := []byte(`{"name": "Test"}`)
	
	// This should panic or handle gracefully
	assert.Panics(t, func() {
		UnmarshalJSON(jsonData, nil)
	})
}

func TestUnmarshalJSON_WithStruct(t *testing.T) {
	type TestStruct struct {
		Name  string  `json:"name"`
		Depth float64 `json:"depth"`
	}
	
	jsonData := []byte(`{"name": "Test Dive", "depth": 30.5}`)
	var target TestStruct
	
	err := UnmarshalJSON(jsonData, &target)
	
	assert.NoError(t, err)
	assert.Equal(t, "Test Dive", target.Name)
	assert.Equal(t, 30.5, target.Depth)
}