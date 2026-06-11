package repository

import (
	"context"
	"divelog-backend/models"
	"testing"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
)

func TestSettingsRepository_GetOrCreateDefault(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewSettingsRepository(db)
	ctx := context.Background()

	// Test getting/creating settings for user
	settings, err := repo.GetOrCreateDefault(ctx, 1)
	assert.NoError(t, err)
	assert.NotNil(t, settings)
	assert.Equal(t, 1, settings.UserID)
	assert.NotEmpty(t, settings.DepthUnit)
	assert.NotEmpty(t, settings.TemperatureUnit)
}

func TestSettingsRepository_GetByUserID(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewSettingsRepository(db)
	ctx := context.Background()

	// Test getting settings for non-existent user
	settings, err := repo.GetByUserID(ctx, 999999)
	assert.Error(t, err)
	assert.Nil(t, settings)
}

// Unit tests for UserSettings methods (no database required)
func TestUserSettings_ToFrontendFormat(t *testing.T) {
	settings := &models.UserSettings{
		ID:                1,
		UserID:            1,
		UnitPreference:    "metric",
		DepthUnit:         "meters",
		TemperatureUnit:   "celsius",
		DistanceUnit:      "kilometers",
		WeightUnit:        "kilograms",
		PressureUnit:      "bar",
		VolumeUnit:        "liters",
		DateFormat:        "ISO",
		TimeFormat:        "24h",
		DefaultVisibility: "private",
	}

	frontend := settings.ToFrontendFormat()

	assert.Equal(t, settings.UnitPreference, frontend["unitPreference"])

	units, ok := frontend["units"].(map[string]string)
	assert.True(t, ok)
	assert.Equal(t, settings.DepthUnit, units["depth"])
	assert.Equal(t, settings.TemperatureUnit, units["temperature"])
	assert.Equal(t, settings.DistanceUnit, units["distance"])
	assert.Equal(t, settings.WeightUnit, units["weight"])
	assert.Equal(t, settings.PressureUnit, units["pressure"])
	assert.Equal(t, settings.VolumeUnit, units["volume"])

	preferences, ok := frontend["preferences"].(map[string]string)
	assert.True(t, ok)
	assert.Equal(t, settings.DateFormat, preferences["dateFormat"])
	assert.Equal(t, settings.TimeFormat, preferences["timeFormat"])
	assert.Equal(t, settings.DefaultVisibility, preferences["defaultVisibility"])
}

func TestSettingsRequest_ToUserSettings(t *testing.T) {
	req := &models.SettingsRequest{}
	req.UnitPreference = "imperial"
	req.Units.Depth = "feet"
	req.Units.Temperature = "fahrenheit"
	req.Units.Distance = "miles"
	req.Units.Weight = "pounds"
	req.Units.Pressure = "psi"
	req.Units.Volume = "cubic_feet"
	req.Preferences.DateFormat = "US"
	req.Preferences.TimeFormat = "12h"
	req.Preferences.DefaultVisibility = "private"

	userID := 1
	settings := req.ToUserSettings(userID)

	assert.Equal(t, userID, settings.UserID)
	assert.Equal(t, req.UnitPreference, settings.UnitPreference)
	assert.Equal(t, req.Units.Depth, settings.DepthUnit)
	assert.Equal(t, req.Units.Temperature, settings.TemperatureUnit)
	assert.Equal(t, req.Units.Distance, settings.DistanceUnit)
	assert.Equal(t, req.Units.Weight, settings.WeightUnit)
	assert.Equal(t, req.Units.Pressure, settings.PressureUnit)
	assert.Equal(t, req.Units.Volume, settings.VolumeUnit)
	assert.Equal(t, req.Preferences.DateFormat, settings.DateFormat)
	assert.Equal(t, req.Preferences.TimeFormat, settings.TimeFormat)
	assert.Equal(t, req.Preferences.DefaultVisibility, settings.DefaultVisibility)
}
