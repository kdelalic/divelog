package handlers

import (
	"bytes"
	"context"
	"divelog-backend/models"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockDiveRepository struct {
	mock.Mock
}

func (m *mockDiveRepository) GetDivesByUserID(ctx context.Context, userID int) ([]models.Dive, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]models.Dive), args.Error(1)
}

func (m *mockDiveRepository) CreateDive(ctx context.Context, dive *models.Dive) error {
	return m.Called(ctx, dive).Error(0)
}

func (m *mockDiveRepository) CreateMultipleDives(ctx context.Context, dives []*models.Dive) ([]models.Dive, []map[string]interface{}, error) {
	args := m.Called(ctx, dives)
	return args.Get(0).([]models.Dive), args.Get(1).([]map[string]interface{}), args.Error(2)
}

func (m *mockDiveRepository) UpdateDive(ctx context.Context, diveID, userID int, dive *models.Dive) error {
	return m.Called(ctx, diveID, userID, dive).Error(0)
}

func (m *mockDiveRepository) DeleteDive(ctx context.Context, diveID, userID int) error {
	return m.Called(ctx, diveID, userID).Error(0)
}

func (m *mockDiveRepository) DeleteAllDives(ctx context.Context, userID int) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

func (m *mockDiveRepository) GetCurrentDive(ctx context.Context, diveID, userID int) (*models.Dive, error) {
	args := m.Called(ctx, diveID, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Dive), args.Error(1)
}

func (m *mockDiveRepository) CheckDuplicateDive(ctx context.Context, userID, diveSiteID int, dateTime string) (bool, error) {
	args := m.Called(ctx, userID, diveSiteID, dateTime)
	return args.Bool(0), args.Error(1)
}

func (m *mockDiveRepository) CheckDuplicateDiveForUpdateByLocation(ctx context.Context, userID int, lat, lng float64, dateTime string, excludeDiveID int) (bool, error) {
	args := m.Called(ctx, userID, lat, lng, dateTime, excludeDiveID)
	return args.Bool(0), args.Error(1)
}

type mockDiveSiteRepository struct {
	mock.Mock
}

func (m *mockDiveSiteRepository) FindOrCreateDiveSite(ctx context.Context, name string, lat, lng float64) (*models.DiveSite, error) {
	args := m.Called(ctx, name, lat, lng)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *mockDiveSiteRepository) GetAll(ctx context.Context) ([]models.DiveSite, error) {
	args := m.Called(ctx)
	return args.Get(0).([]models.DiveSite), args.Error(1)
}

func (m *mockDiveSiteRepository) Search(ctx context.Context, query string) ([]models.DiveSite, error) {
	args := m.Called(ctx, query)
	return args.Get(0).([]models.DiveSite), args.Error(1)
}

func (m *mockDiveSiteRepository) GetByID(ctx context.Context, id int) (*models.DiveSite, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *mockDiveSiteRepository) Create(ctx context.Context, request *models.DiveSiteRequest) (*models.DiveSite, error) {
	args := m.Called(ctx, request)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *mockDiveSiteRepository) Update(ctx context.Context, id int, request *models.DiveSiteRequest) (*models.DiveSite, error) {
	args := m.Called(ctx, id, request)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.DiveSite), args.Error(1)
}

func (m *mockDiveSiteRepository) Delete(ctx context.Context, id int) error {
	return m.Called(ctx, id).Error(0)
}

func (m *mockDiveSiteRepository) GetDiveSiteByDiveID(ctx context.Context, diveID int) (*int, error) {
	args := m.Called(ctx, diveID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*int), args.Error(1)
}

func setupGinContext(method, url string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	jsonBody, _ := json.Marshal(body)
	return setupRawGinContext(method, url, jsonBody)
}

func setupRawGinContext(method, url string, body []byte) (*gin.Context, *httptest.ResponseRecorder) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(method, url, bytes.NewReader(body))
	context.Request.Header.Set("Content-Type", "application/json")
	context.Set("userID", 1)
	return context, recorder
}

func validDiveRequest() models.DiveRequest {
	return models.DiveRequest{
		DateTime: "2026-07-28T10:00:00Z",
		Location: "Monterey Bay",
		Depth:    30,
		Duration: 45,
		Lat:      36.6002,
		Lng:      -121.8947,
	}
}

func TestDiveHandlerCreateDiveAcceptsZeroCoordinates(t *testing.T) {
	diveRepo := new(mockDiveRepository)
	siteRepo := new(mockDiveSiteRepository)
	handler := NewDiveHandler(diveRepo, siteRepo)
	request := validDiveRequest()
	request.Lat = 0
	request.Lng = 0
	site := &models.DiveSite{ID: 7, Name: request.Location}

	siteRepo.On("FindOrCreateDiveSite", mock.Anything, request.Location, float64(0), float64(0)).Return(site, nil)
	diveRepo.On("CheckDuplicateDive", mock.Anything, 1, 7, request.DateTime).Return(false, nil)
	diveRepo.On("CreateDive", mock.Anything, mock.AnythingOfType("*models.Dive")).Return(nil)

	context, recorder := setupGinContext(http.MethodPost, "/dives", request)
	handler.CreateDive(context)

	assert.Equal(t, http.StatusCreated, recorder.Code)
	diveRepo.AssertExpectations(t)
	siteRepo.AssertExpectations(t)
}

func TestDiveHandlerCreateDiveReturnsFieldErrors(t *testing.T) {
	diveRepo := new(mockDiveRepository)
	siteRepo := new(mockDiveSiteRepository)
	handler := NewDiveHandler(diveRepo, siteRepo)
	request := validDiveRequest()
	request.DateTime = "not-a-date"
	request.Depth = 0
	request.Lat = 91

	context, recorder := setupGinContext(http.MethodPost, "/dives", request)
	handler.CreateDive(context)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	var response struct {
		Error  string            `json:"error"`
		Fields map[string]string `json:"fields"`
	}
	assert.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.Equal(t, "validation_failed", response.Error)
	assert.Contains(t, response.Fields, "datetime")
	assert.Contains(t, response.Fields, "depth")
	assert.Contains(t, response.Fields, "lat")
	diveRepo.AssertNotCalled(t, "CreateDive", mock.Anything, mock.Anything)
}

func TestDiveHandlerCreateMultipleDivesReturnsIndexedFieldErrors(t *testing.T) {
	diveRepo := new(mockDiveRepository)
	siteRepo := new(mockDiveSiteRepository)
	handler := NewDiveHandler(diveRepo, siteRepo)
	requests := []models.DiveRequest{validDiveRequest(), validDiveRequest()}
	requests[1].Duration = 0

	context, recorder := setupGinContext(http.MethodPost, "/dives/batch", requests)
	handler.CreateMultipleDives(context)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	var response struct {
		Fields map[string]string `json:"fields"`
	}
	assert.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.Equal(t, "must be between 1 and 1440", response.Fields["dives[1].duration"])
	siteRepo.AssertNotCalled(t, "FindOrCreateDiveSite", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestDiveHandlerCreateDiveRejectsMalformedJSON(t *testing.T) {
	handler := NewDiveHandler(new(mockDiveRepository), new(mockDiveSiteRepository))
	context, recorder := setupRawGinContext(http.MethodPost, "/dives", []byte(`{"datetime":`))

	handler.CreateDive(context)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.JSONEq(t, `{"error":"invalid_request","message":"Request body must contain valid JSON"}`, recorder.Body.String())
}

func TestDiveHandlerDeleteAllDivesReturnsDeletedCount(t *testing.T) {
	diveRepo := new(mockDiveRepository)
	handler := NewDiveHandler(diveRepo, new(mockDiveSiteRepository))

	diveRepo.On("DeleteAllDives", mock.Anything, 1).Return(int64(12), nil)

	context, recorder := setupGinContext(http.MethodDelete, "/dives", nil)
	handler.DeleteAllDives(context)

	assert.Equal(t, http.StatusOK, recorder.Code)
	var response struct {
		DeletedCount int64 `json:"deleted_count"`
	}
	assert.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.Equal(t, int64(12), response.DeletedCount)
	diveRepo.AssertExpectations(t)
}

func TestDiveHandlerDeleteAllDivesReportsRepositoryFailure(t *testing.T) {
	diveRepo := new(mockDiveRepository)
	handler := NewDiveHandler(diveRepo, new(mockDiveSiteRepository))

	diveRepo.On("DeleteAllDives", mock.Anything, 1).Return(int64(0), assert.AnError)

	context, recorder := setupGinContext(http.MethodDelete, "/dives", nil)
	handler.DeleteAllDives(context)

	assert.Equal(t, http.StatusInternalServerError, recorder.Code)
	diveRepo.AssertExpectations(t)
}
