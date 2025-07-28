package handlers

import (
	"context"
	"divelog-backend/models"
	"divelog-backend/repository"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockSettingsRepository for settings handler testing
type MockSettingsRepository struct {
	mock.Mock
}

func (m *MockSettingsRepository) GetOrCreateDefault(ctx context.Context, userID int) (*models.UserSettings, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*models.UserSettings), args.Error(1)
}

func (m *MockSettingsRepository) GetByUserID(ctx context.Context, userID int) (*models.UserSettings, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(*models.UserSettings), args.Error(1)
}

func (m *MockSettingsRepository) Update(ctx context.Context, settings *models.UserSettings) error {
	args := m.Called(ctx, settings)
	return args.Error(0)
}

func setupSettingsHandler() (*SettingsHandler, *MockSettingsRepository) {
	mockRepo := new(MockSettingsRepository)
	handler := NewSettingsHandler((*repository.SettingsRepository)(mockRepo))
	return handler, mockRepo
}

func TestSettingsHandler_GetSettings(t *testing.T) {
	handler, mockRepo := setupSettingsHandler()
	
	expectedSettings := &models.UserSettings{
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
	
	mockRepo.On("GetOrCreateDefault", mock.Anything, 1).Return(expectedSettings, nil)
	
	c, w := setupGinContext("GET", "/settings?user_id=1", nil)
	c.Request.URL.RawQuery = "user_id=1"
	
	handler.GetSettings(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestSettingsHandler_GetSettings_DefaultUser(t *testing.T) {
	handler, mockRepo := setupSettingsHandler()
	
	expectedSettings := &models.UserSettings{
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
	
	mockRepo.On("GetOrCreateDefault", mock.Anything, 1).Return(expectedSettings, nil)
	
	c, w := setupGinContext("GET", "/settings", nil)
	
	handler.GetSettings(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestSettingsHandler_GetSettings_InvalidUserID(t *testing.T) {
	handler, _ := setupSettingsHandler()
	
	c, w := setupGinContext("GET", "/settings?user_id=invalid", nil)
	c.Request.URL.RawQuery = "user_id=invalid"
	
	handler.GetSettings(c)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSettingsHandler_UpdateSettings(t *testing.T) {
	handler, mockRepo := setupSettingsHandler()
	
	settingsReq := models.SettingsRequest{
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
	
	updatedSettings := &models.UserSettings{
		ID:               1,
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
	
	mockRepo.On("Update", mock.Anything, mock.AnythingOfType("*models.UserSettings")).Return(nil)
	mockRepo.On("GetByUserID", mock.Anything, 1).Return(updatedSettings, nil)
	
	c, w := setupGinContext("PUT", "/settings?user_id=1", settingsReq)
	c.Request.URL.RawQuery = "user_id=1"
	
	handler.UpdateSettings(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestSettingsHandler_UpdateSettings_InvalidJSON(t *testing.T) {
	handler, _ := setupSettingsHandler()
	
	c, w := setupGinContext("PUT", "/settings?user_id=1", "invalid json")
	c.Request.URL.RawQuery = "user_id=1"
	
	handler.UpdateSettings(c)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestSettingsHandler_UpdateSettings_InvalidUserID(t *testing.T) {
	handler, _ := setupSettingsHandler()
	
	settingsReq := models.SettingsRequest{
		DistanceUnit: "feet",
	}
	
	c, w := setupGinContext("PUT", "/settings?user_id=invalid", settingsReq)
	c.Request.URL.RawQuery = "user_id=invalid"
	
	handler.UpdateSettings(c)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
}