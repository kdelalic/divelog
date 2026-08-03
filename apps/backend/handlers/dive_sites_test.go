package handlers

import (
	"divelog-backend/models"
	"divelog-backend/utils"
	"encoding/json"
	"net/http"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestDiveSiteHandlerCreateAcceptsZeroCoordinates(t *testing.T) {
	repository := new(mockDiveSiteRepository)
	handler := NewDiveSiteHandler(repository)
	request := models.DiveSiteRequest{Name: "Null Island", Latitude: 0, Longitude: 0}
	expected := &models.DiveSite{ID: 1, Name: request.Name, Latitude: 0, Longitude: 0}
	repository.On("Create", mock.Anything, &request).Return(expected, nil)

	context, recorder := setupGinContext(http.MethodPost, "/dive-sites", request)
	handler.CreateDiveSite(context)

	assert.Equal(t, http.StatusCreated, recorder.Code)
	repository.AssertExpectations(t)
}

func TestDiveSiteHandlerCreateReturnsFieldErrors(t *testing.T) {
	repository := new(mockDiveSiteRepository)
	handler := NewDiveSiteHandler(repository)
	request := models.DiveSiteRequest{Name: "   ", Latitude: -91, Longitude: 181}

	context, recorder := setupGinContext(http.MethodPost, "/dive-sites", request)
	handler.CreateDiveSite(context)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
	var response struct {
		Fields map[string]string `json:"fields"`
	}
	assert.NoError(t, json.Unmarshal(recorder.Body.Bytes(), &response))
	assert.Equal(t, "is required", response.Fields["name"])
	assert.Contains(t, response.Fields, "latitude")
	assert.Contains(t, response.Fields, "longitude")
	repository.AssertNotCalled(t, "Create", mock.Anything, mock.Anything)
}

func TestDiveSiteHandlerGetReturnsNotFound(t *testing.T) {
	repository := new(mockDiveSiteRepository)
	handler := NewDiveSiteHandler(repository)
	repository.On("GetByID", mock.Anything, 999).Return(nil, utils.ErrDiveSiteNotFound)

	context, recorder := setupGinContext(http.MethodGet, "/dive-sites/999", nil)
	context.Params = gin.Params{{Key: "id", Value: "999"}}
	handler.GetDiveSite(context)

	assert.Equal(t, http.StatusNotFound, recorder.Code)
	repository.AssertExpectations(t)
}
