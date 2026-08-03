package repository

import (
	"context"
	"divelog-backend/models"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestSettingsRepositoryGetOrCreateDefault(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	settings, err := NewSettingsRepository(db).GetOrCreateDefault(context.Background(), 1)
	assert.NoError(t, err)
	assert.NotNil(t, settings)
}

func TestUserSettingsToFrontendFormat(t *testing.T) {
	settings := &models.UserSettings{
		UnitPreference:      "metric",
		DepthUnit:           "meters",
		TemperatureUnit:     "celsius",
		DistanceUnit:        "kilometers",
		WeightUnit:          "kilograms",
		PressureUnit:        "bar",
		VolumeUnit:          "liters",
		DateFormat:          "ISO",
		TimeFormat:          "24h",
		DefaultVisibility:   "private",
		ShowBuddyReminders:  true,
		AutoCalculateNitrox: false,
		DefaultGasMix:       "Air (21% O₂)",
		MaxDepthWarning:     40,
	}

	frontend := settings.ToFrontendFormat()
	assert.Equal(t, "metric", frontend["unitPreference"])
	assert.Equal(t, "meters", frontend["units"].(map[string]string)["depth"])
	assert.Equal(t, "ISO", frontend["preferences"].(map[string]string)["dateFormat"])
	assert.Equal(t, 40, frontend["dive"].(map[string]interface{})["maxDepthWarning"])
}

func TestSettingsRequestToUserSettings(t *testing.T) {
	var request models.SettingsRequest
	request.UnitPreference = "imperial"
	request.Units.Depth = "feet"
	request.Units.Temperature = "fahrenheit"
	request.Units.Distance = "miles"
	request.Units.Weight = "pounds"
	request.Units.Pressure = "psi"
	request.Units.Volume = "cubic_feet"
	request.Preferences.DateFormat = "US"
	request.Preferences.TimeFormat = "12h"
	request.Preferences.DefaultVisibility = "public"
	request.Dive.ShowBuddyReminders = true
	request.Dive.DefaultGasMix = "Nitrox 32 (32% O₂)"
	request.Dive.MaxDepthWarning = 130

	settings := request.ToUserSettings(42)
	assert.Equal(t, 42, settings.UserID)
	assert.Equal(t, request.UnitPreference, settings.UnitPreference)
	assert.Equal(t, request.Units.Depth, settings.DepthUnit)
	assert.Equal(t, request.Preferences.DateFormat, settings.DateFormat)
	assert.Equal(t, request.Dive.MaxDepthWarning, settings.MaxDepthWarning)
}
