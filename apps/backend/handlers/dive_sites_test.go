package handlers

import (
	"context"
	"divelog-backend/models"
	"divelog-backend/repository"
	"divelog-backend/utils"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockDiveSiteRepository for dive sites handler testing
type MockDiveSiteRepositoryHandler struct {
	mock.Mock
}

func (m *MockDiveSiteRepositoryHandler) GetAll(ctx context.Context) ([]models.DiveSite, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.DiveSite), args.Error(1)
}

func (m *MockDiveSiteRepositoryHandler) Search(ctx context.Context, query string) ([]models.DiveSite, error) {
	args := m.Called(ctx, query)
	return args.Get(0).([]models.DiveSite), args.Error(1)
}

func (m *MockDiveSiteRepositoryHandler) GetByID(ctx context.Context, id int) (*models.DiveSite, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *MockDiveSiteRepositoryHandler) Create(ctx context.Context, siteReq *models.DiveSiteRequest) (*models.DiveSite, error) {
	args := m.Called(ctx, siteReq)
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *MockDiveSiteRepositoryHandler) Update(ctx context.Context, id int, siteReq *models.DiveSiteRequest) (*models.DiveSite, error) {
	args := m.Called(ctx, id, siteReq)
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *MockDiveSiteRepositoryHandler) Delete(ctx context.Context, id int) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockDiveSiteRepositoryHandler) FindOrCreateDiveSite(ctx context.Context, name string, lat, lng float64) (*models.DiveSite, error) {
	args := m.Called(ctx, name, lat, lng)
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *MockDiveSiteRepositoryHandler) GetDiveSiteByDiveID(ctx context.Context, diveID int) (*int, error) {
	args := m.Called(ctx, diveID)
	return args.Get(0).(*int), args.Error(1)
}

func setupDiveSiteHandler() (*DiveSiteHandler, *MockDiveSiteRepositoryHandler) {
	mockRepo := new(MockDiveSiteRepositoryHandler)
	handler := NewDiveSiteHandler((*repository.DiveSiteRepository)(mockRepo))
	return handler, mockRepo
}

func TestDiveSiteHandler_GetDiveSites(t *testing.T) {
	handler, mockRepo := setupDiveSiteHandler()
	
	expectedSites := []models.DiveSite{
		{
			ID:        1,
			Name:      "Test Site 1",
			Latitude:  40.7128,
			Longitude: -74.0060,
		},
		{
			ID:        2,
			Name:      "Test Site 2", 
			Latitude:  40.7500,
			Longitude: -73.9857,
		},
	}
	
	mockRepo.On("GetAll", mock.Anything).Return(expectedSites, nil)
	
	c, w := setupGinContext("GET", "/dive-sites", nil)
	
	handler.GetDiveSites(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestDiveSiteHandler_SearchDiveSites(t *testing.T) {
	handler, mockRepo := setupDiveSiteHandler()
	
	expectedSites := []models.DiveSite{
		{
			ID:        1,
			Name:      "Coral Reef",
			Latitude:  40.7128,
			Longitude: -74.0060,
		},
	}
	
	mockRepo.On("Search", mock.Anything, "coral").Return(expectedSites, nil)
	
	c, w := setupGinContext("GET", "/dive-sites/search?q=coral", nil)
	c.Request.URL.RawQuery = "q=coral"
	
	handler.SearchDiveSites(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestDiveSiteHandler_GetDiveSite(t *testing.T) {
	handler, mockRepo := setupDiveSiteHandler()
	
	expectedSite := &models.DiveSite{
		ID:        1,
		Name:      "Test Site",
		Latitude:  40.7128,
		Longitude: -74.0060,
	}
	
	mockRepo.On("GetByID", mock.Anything, 1).Return(expectedSite, nil)
	
	c, w := setupGinContext("GET", "/dive-sites/1", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	
	handler.GetDiveSite(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestDiveSiteHandler_GetDiveSite_NotFound(t *testing.T) {
	handler, mockRepo := setupDiveSiteHandler()
	
	mockRepo.On("GetByID", mock.Anything, 999).Return((*models.DiveSite)(nil), utils.ErrDiveSiteNotFound)
	
	c, w := setupGinContext("GET", "/dive-sites/999", nil)
	c.Params = gin.Params{{Key: "id", Value: "999"}}
	
	handler.GetDiveSite(c)
	
	assert.Equal(t, http.StatusNotFound, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestDiveSiteHandler_CreateDiveSite(t *testing.T) {
	handler, mockRepo := setupDiveSiteHandler()
	
	siteReq := models.DiveSiteRequest{
		Name:        "New Test Site",
		Latitude:    40.7128,
		Longitude:   -74.0060,
		Description: "A great diving spot",
	}
	
	expectedSite := &models.DiveSite{
		ID:          1,
		Name:        "New Test Site",
		Latitude:    40.7128,
		Longitude:   -74.0060,
		Description: "A great diving spot",
	}
	
	mockRepo.On("Create", mock.Anything, &siteReq).Return(expectedSite, nil)
	
	c, w := setupGinContext("POST", "/dive-sites", siteReq)
	
	handler.CreateDiveSite(c)
	
	assert.Equal(t, http.StatusCreated, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestDiveSiteHandler_UpdateDiveSite(t *testing.T) {
	handler, mockRepo := setupDiveSiteHandler()
	
	siteReq := models.DiveSiteRequest{
		Name:        "Updated Site",
		Latitude:    40.7500,
		Longitude:   -73.9857,
		Description: "Updated description",
	}
	
	expectedSite := &models.DiveSite{
		ID:          1,
		Name:        "Updated Site",
		Latitude:    40.7500,
		Longitude:   -73.9857,
		Description: "Updated description",
	}
	
	mockRepo.On("Update", mock.Anything, 1, &siteReq).Return(expectedSite, nil)
	
	c, w := setupGinContext("PUT", "/dive-sites/1", siteReq)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	
	handler.UpdateDiveSite(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestDiveSiteHandler_DeleteDiveSite(t *testing.T) {
	handler, mockRepo := setupDiveSiteHandler()
	
	mockRepo.On("Delete", mock.Anything, 1).Return(nil)
	
	c, w := setupGinContext("DELETE", "/dive-sites/1", nil)
	c.Params = gin.Params{{Key: "id", Value: "1"}}
	
	handler.DeleteDiveSite(c)
	
	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestDiveSiteHandler_DeleteDiveSite_NotFound(t *testing.T) {
	handler, mockRepo := setupDiveSiteHandler()
	
	mockRepo.On("Delete", mock.Anything, 999).Return(utils.ErrDiveSiteNotFound)
	
	c, w := setupGinContext("DELETE", "/dive-sites/999", nil)
	c.Params = gin.Params{{Key: "id", Value: "999"}}
	
	handler.DeleteDiveSite(c)
	
	assert.Equal(t, http.StatusNotFound, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestDiveSiteHandler_InvalidID(t *testing.T) {
	handler, _ := setupDiveSiteHandler()
	
	c, w := setupGinContext("GET", "/dive-sites/invalid", nil)
	c.Params = gin.Params{{Key: "id", Value: "invalid"}}
	
	handler.GetDiveSite(c)
	
	assert.Equal(t, http.StatusBadRequest, w.Code)
}