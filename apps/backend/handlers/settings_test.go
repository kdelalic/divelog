package handlers

import (
	"context"
	"divelog-backend/models"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockSettingsRepository struct {
	mock.Mock
}

func (m *mockSettingsRepository) GetOrCreateDefault(ctx context.Context, userID int) (*models.UserSettings, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.UserSettings), args.Error(1)
}

func (m *mockSettingsRepository) GetByUserID(ctx context.Context, userID int) (*models.UserSettings, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.UserSettings), args.Error(1)
}

func (m *mockSettingsRepository) Update(ctx context.Context, settings *models.UserSettings) error {
	return m.Called(ctx, settings).Error(0)
}

func validSettingsRequest() models.SettingsRequest {
	var request models.SettingsRequest
	request.UnitPreference = "metric"
	request.Units.Depth = "meters"
	request.Units.Temperature = "celsius"
	request.Units.Distance = "kilometers"
	request.Units.Weight = "kilograms"
	request.Units.Pressure = "bar"
	request.Units.Volume = "liters"
	request.Preferences.DateFormat = "ISO"
	request.Preferences.TimeFormat = "24h"
	request.Preferences.DefaultVisibility = "private"
	request.Dive.DefaultGasMix = "Air (21% O₂)"
	request.Dive.MaxDepthWarning = 40
	return request
}

func TestSettingsHandlerUpdateSettings(t *testing.T) {
	repository := new(mockSettingsRepository)
	handler := NewSettingsHandler(repository)
	request := validSettingsRequest()
	updated := request.ToUserSettings(1)
	repository.On("Update", mock.Anything, mock.AnythingOfType("*models.UserSettings")).Return(nil)
	repository.On("GetByUserID", mock.Anything, 1).Return(updated, nil)

	context, recorder := setupGinContext(http.MethodPut, "/settings?user_id=1", request)
	context.Request.URL.RawQuery = "user_id=1"
	handler.UpdateSettings(context)

	assert.Equal(t, http.StatusOK, recorder.Code)
	repository.AssertExpectations(t)
}

func TestSettingsHandlerUpdateReturnsFieldErrors(t *testing.T) {
	repository := new(mockSettingsRepository)
	handler := NewSettingsHandler(repository)
	request := validSettingsRequest()
	request.UnitPreference = "nautical"
	request.Units.Depth = "yards"
	request.Dive.MaxDepthWarning = 0

	context, recorder := setupGinContext(http.MethodPut, "/settings?user_id=1", request)
	context.Request.URL.RawQuery = "user_id=1"
	handler.UpdateSettings(context)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	var response struct {
		Fields map[string]string `json:"fields"`
	}
	assert.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.Contains(t, response.Fields, "unitPreference")
	assert.Contains(t, response.Fields, "units.depth")
	assert.Contains(t, response.Fields, "dive.maxDepthWarning")
	repository.AssertNotCalled(t, "Update", mock.Anything, mock.Anything)
}

func TestSettingsHandlerUpdateRejectsMalformedJSON(t *testing.T) {
	handler := NewSettingsHandler(new(mockSettingsRepository))
	context, recorder := setupRawGinContext(http.MethodPut, "/settings?user_id=1", []byte(`{"units":`))
	context.Request.URL.RawQuery = "user_id=1"

	handler.UpdateSettings(context)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.JSONEq(t, `{"error":"invalid_request","message":"Request body must contain valid JSON"}`, recorder.Body.String())
}
