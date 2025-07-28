package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/repository"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockDiveRepository for testing
type MockDiveRepository struct {
	mock.Mock
}

func (m *MockDiveRepository) CreateDive(ctx context.Context, dive *models.Dive) error {
	args := m.Called(ctx, dive)
	return args.Error(0)
}

func (m *MockDiveRepository) GetDivesByUserID(ctx context.Context, userID int) ([]*models.Dive, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]*models.Dive), args.Error(1)
}

func (m *MockDiveRepository) UpdateDive(ctx context.Context, diveID, userID int, dive *models.Dive) error {
	args := m.Called(ctx, diveID, userID, dive)
	return args.Error(0)
}

func (m *MockDiveRepository) DeleteDive(ctx context.Context, diveID, userID int) error {
	args := m.Called(ctx, diveID, userID)
	return args.Error(0)
}

func (m *MockDiveRepository) CheckDuplicateDive(ctx context.Context, userID, diveSiteID int, dateTime string) (bool, error) {
	args := m.Called(ctx, userID, diveSiteID, dateTime)
	return args.Bool(0), args.Error(1)
}

func (m *MockDiveRepository) CheckDuplicateDiveForUpdateByLocation(ctx context.Context, userID int, lat, lng float64, dateTime string, excludeDiveID int) (bool, error) {
	args := m.Called(ctx, userID, lat, lng, dateTime, excludeDiveID)
	return args.Bool(0), args.Error(1)
}

func (m *MockDiveRepository) GetCurrentDive(ctx context.Context, diveID, userID int) (*models.Dive, error) {
	args := m.Called(ctx, diveID, userID)
	return args.Get(0).(*models.Dive), args.Error(1)
}

func (m *MockDiveRepository) CreateMultipleDives(ctx context.Context, dives []*models.Dive) ([]*models.Dive, []error, error) {
	args := m.Called(ctx, dives)
	return args.Get(0).([]*models.Dive), args.Get(1).([]error), args.Error(2)
}

// MockDiveSiteRepository for testing
type MockDiveSiteRepository struct {
	mock.Mock
}

func (m *MockDiveSiteRepository) FindOrCreateDiveSite(ctx context.Context, name string, lat, lng float64) (*models.DiveSite, error) {
	args := m.Called(ctx, name, lat, lng)
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *MockDiveSiteRepository) GetByID(ctx context.Context, id int) (*models.DiveSite, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *MockDiveSiteRepository) GetDiveSiteByDiveID(ctx context.Context, diveID int) (*int, error) {
	args := m.Called(ctx, diveID)
	return args.Get(0).(*int), args.Error(1)
}

func setupDiveHandler() (*DiveHandler, *MockDiveRepository, *MockDiveSiteRepository) {
	mockDiveRepo := new(MockDiveRepository)
	mockDiveSiteRepo := new(MockDiveSiteRepository)
	handler := NewDiveHandler((*repository.DiveRepository)(mockDiveRepo), (*repository.DiveSiteRepository)(mockDiveSiteRepo))
	return handler, mockDiveRepo, mockDiveSiteRepo
}

func setupGinContext(method, url string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	
	var req *http.Request
	if body != nil {
		jsonBody, _ := json.Marshal(body)
		req = httptest.NewRequest(method, url, bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, url, nil)
	}
	
	c.Request = req
	c.Set("user_id", 1) // Set user ID for middleware simulation
	
	return c, w
}

func TestDiveHandler_GetDives(t *testing.T) {
	handler, mockDiveRepo, _ := setupDiveHandler()
	
	expectedDives := []*models.Dive{
		{
			ID:       1,
			UserID:   1,
			Location: "Test Location",
			MaxDepth: 30.0,
			Duration: 45,
		},
	}
	
	mockDiveRepo.On("GetDivesByUserID", mock.Anything, 1).Return(expectedDives, nil)
	
	c, w := setupGinContext("GET", "/dives", nil)
	
	handler.GetDives(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockDiveRepo.AssertExpectations(t)
}

func TestDiveHandler_CreateDive(t *testing.T) {
	handler, mockDiveRepo, mockDiveSiteRepo := setupDiveHandler()
	
	diveReq := models.DiveRequest{
		DateTime:  "2023-07-28T10:00:00Z",
		Location:  "Test Location",
		MaxDepth:  30.0,
		Duration:  45,
		Lat:       40.7128,
		Lng:       -74.0060,
	}
	
	expectedDiveSite := &models.DiveSite{
		ID:        1,
		Name:      "Test Location",
		Latitude:  40.7128,
		Longitude: -74.0060,
	}
	
	mockDiveSiteRepo.On("FindOrCreateDiveSite", mock.Anything, "Test Location", 40.7128, -74.0060).Return(expectedDiveSite, nil)
	mockDiveRepo.On("CheckDuplicateDive", mock.Anything, 1, 1, "2023-07-28T10:00:00Z").Return(false, nil)
	mockDiveRepo.On("CreateDive", mock.Anything, mock.AnythingOfType("*models.Dive")).Return(nil)
	
	c, w := setupGinContext("POST", "/dives", diveReq)
	
	handler.CreateDive(c)
	
	assert.Equal(t, http.StatusCreated, w.Code)
	mockDiveRepo.AssertExpectations(t)
	mockDiveSiteRepo.AssertExpectations(t)
}

func TestDiveHandler_CreateDive_Duplicate(t *testing.T) {
	handler, mockDiveRepo, mockDiveSiteRepo := setupDiveHandler()
	
	diveReq := models.DiveRequest{
		DateTime:  "2023-07-28T10:00:00Z",
		Location:  "Test Location",
		MaxDepth:  30.0,
		Duration:  45,
		Lat:       40.7128,
		Lng:       -74.0060,
	}
	
	expectedDiveSite := &models.DiveSite{
		ID:        1,
		Name:      "Test Location",
		Latitude:  40.7128,
		Longitude: -74.0060,
	}
	
	mockDiveSiteRepo.On("FindOrCreateDiveSite", mock.Anything, "Test Location", 40.7128, -74.0060).Return(expectedDiveSite, nil)
	mockDiveRepo.On("CheckDuplicateDive", mock.Anything, 1, 1, "2023-07-28T10:00:00Z").Return(true, nil)
	
	c, w := setupGinContext("POST", "/dives", diveReq)
	
	handler.CreateDive(c)
	
	assert.Equal(t, http.StatusConflict, w.Code)
	mockDiveRepo.AssertExpectations(t)
	mockDiveSiteRepo.AssertExpectations(t)
}

func TestDiveHandler_UpdateDive(t *testing.T) {
	handler, mockDiveRepo, mockDiveSiteRepo := setupDiveHandler()
	
	diveReq := models.DiveRequest{
		DateTime:  "2023-07-28T10:00:00Z",
		Location:  "Updated Location",
		MaxDepth:  35.0,
		Duration:  50,
		Lat:       40.7500,
		Lng:       -73.9857,
	}
	
	currentDive := &models.Dive{
		ID:        1,
		UserID:    1,
		DateTime:  models.LocalTime{Time: time.Now().AddDate(0, 0, -1)},
		Location:  "Old Location",
		MaxDepth:  30.0,
		Duration:  45,
		Latitude:  40.7128,
		Longitude: -74.0060,
	}
	
	expectedDiveSite := &models.DiveSite{
		ID:        2,
		Name:      "Updated Location",
		Latitude:  40.7500,
		Longitude: -73.9857,
	}
	
	mockDiveRepo.On("GetCurrentDive", mock.Anything, 1, 1).Return(currentDive, nil)
	mockDiveSiteRepo.On("FindOrCreateDiveSite", mock.Anything, "Updated Location", 40.7500, -73.9857).Return(expectedDiveSite, nil)
	mockDiveRepo.On("CheckDuplicateDiveForUpdateByLocation", mock.Anything, 1, 40.7500, -73.9857, "2023-07-28T10:00:00Z", 1).Return(false, nil)
	mockDiveRepo.On("UpdateDive", mock.Anything, 1, 1, mock.AnythingOfType("*models.Dive")).Return(nil)
	
	c, w := setupGinContext("PUT", "/dives/1", diveReq)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	
	handler.UpdateDive(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockDiveRepo.AssertExpectations(t)
	mockDiveSiteRepo.AssertExpectations(t)
}

func TestDiveHandler_DeleteDive(t *testing.T) {
	handler, mockDiveRepo, _ := setupDiveHandler()
	
	mockDiveRepo.On("DeleteDive", mock.Anything, 1, 1).Return(nil)
	
	c, w := setupGinContext("DELETE", "/dives/1", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	
	handler.DeleteDive(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockDiveRepo.AssertExpectations(t)
}

func TestDiveHandler_CreateMultipleDives(t *testing.T) {
	handler, mockDiveRepo, mockDiveSiteRepo := setupDiveHandler()
	
	diveReqs := []models.DiveRequest{
		{
			DateTime:  "2023-07-28T10:00:00Z",
			Location:  "Location 1",
			MaxDepth:  30.0,
			Duration:  45,
			Lat:       40.7128,
			Lng:       -74.0060,
		},
		{
			DateTime:  "2023-07-29T11:00:00Z",
			Location:  "Location 2", 
			MaxDepth:  25.0,
			Duration:  40,
			Lat:       40.7500,
			Lng:       -73.9857,
		},
	}
	
	diveSite1 := &models.DiveSite{ID: 1, Name: "Location 1", Latitude: 40.7128, Longitude: -74.0060}
	diveSite2 := &models.DiveSite{ID: 2, Name: "Location 2", Latitude: 40.7500, Longitude: -73.9857}
	
	mockDiveSiteRepo.On("FindOrCreateDiveSite", mock.Anything, "Location 1", 40.7128, -74.0060).Return(diveSite1, nil)
	mockDiveSiteRepo.On("FindOrCreateDiveSite", mock.Anything, "Location 2", 40.7500, -73.9857).Return(diveSite2, nil)
	mockDiveRepo.On("CheckDuplicateDive", mock.Anything, 1, 1, "2023-07-28T10:00:00Z").Return(false, nil)
	mockDiveRepo.On("CheckDuplicateDive", mock.Anything, 1, 2, "2023-07-29T11:00:00Z").Return(false, nil)
	
	createdDives := []*models.Dive{
		{ID: 1, UserID: 1, Location: "Location 1"},
		{ID: 2, UserID: 1, Location: "Location 2"},
	}
	mockDiveRepo.On("CreateMultipleDives", mock.Anything, mock.AnythingOfType("[]*models.Dive")).Return(createdDives, []error{}, nil)
	
	c, w := setupGinContext("POST", "/dives/batch", diveReqs)
	
	handler.CreateMultipleDives(c)
	
	assert.Equal(t, http.StatusCreated, w.Code)
	mockDiveRepo.AssertExpectations(t)
	mockDiveSiteRepo.AssertExpectations(t)
}