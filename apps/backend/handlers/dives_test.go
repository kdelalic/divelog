package handlers

import (
	"bytes"
	"context"
	"divelog-backend/models"
	"divelog-backend/services"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type mockDiveService struct {
	mock.Mock
}

func (m *mockDiveService) GetDives(ctx context.Context, userID int) ([]models.Dive, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]models.Dive), args.Error(1)
}

func (m *mockDiveService) CreateDive(ctx context.Context, userID int, request models.DiveRequest) (*models.Dive, error) {
	args := m.Called(ctx, userID, request)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Dive), args.Error(1)
}

func (m *mockDiveService) CreateMultipleDives(ctx context.Context, userID int, requests []models.DiveRequest) (*services.BatchCreateResult, error) {
	args := m.Called(ctx, userID, requests)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*services.BatchCreateResult), args.Error(1)
}

func (m *mockDiveService) UpdateDive(ctx context.Context, diveID, userID int, request models.DiveRequest) (*models.Dive, error) {
	args := m.Called(ctx, diveID, userID, request)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.Dive), args.Error(1)
}

func (m *mockDiveService) DeleteDive(ctx context.Context, diveID, userID int) error {
	return m.Called(ctx, diveID, userID).Error(0)
}

func (m *mockDiveService) DeleteAllDives(ctx context.Context, userID int) (int64, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(int64), args.Error(1)
}

type mockDiveSiteRepository struct {
	mock.Mock
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
	service := new(mockDiveService)
	handler := NewDiveHandler(service)
	request := validDiveRequest()
	request.Lat = 0
	request.Lng = 0
	service.On("CreateDive", mock.Anything, 1, request).Return(request.ToDive(1), nil)

	context, recorder := setupGinContext(http.MethodPost, "/dives", request)
	handler.CreateDive(context)

	assert.Equal(t, http.StatusCreated, recorder.Code)
	service.AssertExpectations(t)
}

func TestDiveHandlerCreateDiveReturnsFieldErrors(t *testing.T) {
	service := new(mockDiveService)
	handler := NewDiveHandler(service)
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
	service.AssertNotCalled(t, "CreateDive", mock.Anything, mock.Anything, mock.Anything)
}

func TestDiveHandlerCreateMultipleDivesReturnsIndexedFieldErrors(t *testing.T) {
	service := new(mockDiveService)
	handler := NewDiveHandler(service)
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
	service.AssertNotCalled(t, "CreateMultipleDives", mock.Anything, mock.Anything, mock.Anything)
}

func TestDiveHandlerCreateDiveRejectsMalformedJSON(t *testing.T) {
	handler := NewDiveHandler(new(mockDiveService))
	context, recorder := setupRawGinContext(http.MethodPost, "/dives", []byte(`{"datetime":`))

	handler.CreateDive(context)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	assert.JSONEq(t, `{"error":"invalid_request","message":"Request body must contain valid JSON"}`, recorder.Body.String())
}

func TestDiveHandlerDeleteAllDivesReturnsDeletedCount(t *testing.T) {
	service := new(mockDiveService)
	handler := NewDiveHandler(service)

	service.On("DeleteAllDives", mock.Anything, 1).Return(int64(12), nil)

	context, recorder := setupGinContext(http.MethodDelete, "/dives", nil)
	handler.DeleteAllDives(context)

	assert.Equal(t, http.StatusOK, recorder.Code)
	var response struct {
		DeletedCount int64 `json:"deleted_count"`
	}
	assert.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.Equal(t, int64(12), response.DeletedCount)
	service.AssertExpectations(t)
}

func TestDiveHandlerDeleteAllDivesReportsRepositoryFailure(t *testing.T) {
	service := new(mockDiveService)
	handler := NewDiveHandler(service)

	service.On("DeleteAllDives", mock.Anything, 1).Return(int64(0), assert.AnError)

	context, recorder := setupGinContext(http.MethodDelete, "/dives", nil)
	handler.DeleteAllDives(context)

	assert.Equal(t, http.StatusInternalServerError, recorder.Code)
	service.AssertExpectations(t)
}
