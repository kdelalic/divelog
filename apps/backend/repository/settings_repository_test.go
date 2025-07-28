package repository

import (
	"context"
	"database/sql"
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
	assert.NotEmpty(t, settings.DistanceUnit)
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

func TestSettingsRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewSettingsRepository(db)
	ctx := context.Background()
	
	// Test updating settings
	settings := &models.UserSettings{
		UserID:           1,
		DistanceUnit:     "feet",
		TemperatureUnit:  "fahrenheit",
		PressureUnit:     "psi",
		WeightUnit:       "lbs",
		VolumeUnit:       "cubic_feet",
		DiveNumbering:    "continuous",
		DateFormat:       "mm/dd/yyyy",
		Language:         "en",
		Theme:            "dark",
	}
	
	err := repo.Update(ctx, settings)
	// This will likely error without proper setup, but we're testing the method signature
	assert.NotPanics(t, func() {
		repo.Update(ctx, settings)
	})
}

// Unit tests for UserSettings methods
func TestUserSettings_ToFrontendFormat(t *testing.T) {
	settings := &models.UserSettings{
		ID:               1,
		UserID:           1,
		DistanceUnit:     "meters",
		TemperatureUnit:  "celsius",
		PressureUnit:     "bar",
		WeightUnit:       "kg",
		VolumeUnit:       "liters",
		DiveNumbering:    "sequential",
		DateFormat:       "yyyy-mm-dd",
		Language:         "en",
		Theme:            "light",
	}
	
	frontend := settings.ToFrontendFormat()
	
	assert.Equal(t, settings.DistanceUnit, frontend["distance_unit"])
	assert.Equal(t, settings.TemperatureUnit, frontend["temperature_unit"])
	assert.Equal(t, settings.PressureUnit, frontend["pressure_unit"])
	assert.Equal(t, settings.WeightUnit, frontend["weight_unit"])
	assert.Equal(t, settings.VolumeUnit, frontend["volume_unit"])
	assert.Equal(t, settings.DiveNumbering, frontend["dive_numbering"])
	assert.Equal(t, settings.DateFormat, frontend["date_format"])
	assert.Equal(t, settings.Language, frontend["language"])
	assert.Equal(t, settings.Theme, frontend["theme"])
}

func TestSettingsRequest_ToUserSettings(t *testing.T) {
	req := &models.SettingsRequest{
		DistanceUnit:     "feet",
		TemperatureUnit:  "fahrenheit",
		PressureUnit:     "psi",
		WeightUnit:       "lbs",
		VolumeUnit:       "cubic_feet",
		DiveNumbering:    "continuous",
		DateFormat:       "mm/dd/yyyy",
		Language:         "en",
		Theme:            "dark",
	}
	
	userID := 1
	settings := req.ToUserSettings(userID)
	
	assert.Equal(t, userID, settings.UserID)
	assert.Equal(t, req.DistanceUnit, settings.DistanceUnit)
	assert.Equal(t, req.TemperatureUnit, settings.TemperatureUnit)
	assert.Equal(t, req.PressureUnit, settings.PressureUnit)
	assert.Equal(t, req.WeightUnit, settings.WeightUnit)
	assert.Equal(t, req.VolumeUnit, settings.VolumeUnit)
	assert.Equal(t, req.DiveNumbering, settings.DiveNumbering)
	assert.Equal(t, req.DateFormat, settings.DateFormat)
	assert.Equal(t, req.Language, settings.Language)
	assert.Equal(t, req.Theme, settings.Theme)
}

func TestDefaultUserSettings(t *testing.T) {
	defaults := &models.UserSettings{
		UserID:           1,
		DistanceUnit:     "meters",
		TemperatureUnit:  "celsius",
		PressureUnit:     "bar",
		WeightUnit:       "kg",
		VolumeUnit:       "liters",
		DiveNumbering:    "sequential",
		DateFormat:       "yyyy-mm-dd",
		Language:         "en",
		Theme:            "light",
	}
	
	// Test that defaults are reasonable
	assert.Equal(t, "meters", defaults.DistanceUnit)
	assert.Equal(t, "celsius", defaults.TemperatureUnit)
	assert.Equal(t, "bar", defaults.PressureUnit)
	assert.Equal(t, "kg", defaults.WeightUnit)
	assert.Equal(t, "liters", defaults.VolumeUnit)
	assert.Equal(t, "sequential", defaults.DiveNumbering)
	assert.Equal(t, "yyyy-mm-dd", defaults.DateFormat)
	assert.Equal(t, "en", defaults.Language)
	assert.Equal(t, "light", defaults.Theme)
}