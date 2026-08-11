package services

import (
	"context"
	"divelog-backend/models"
	"divelog-backend/utils"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newDiveSiteServiceHarness() (*DiveSiteService, *mockDiveRepository, *mockDiveSiteRepository, *recordingTransactor) {
	dives := new(mockDiveRepository)
	sites := new(mockDiveSiteRepository)
	tx := &recordingTransactor{dives: dives, sites: sites}
	return NewDiveSiteService(sites, tx), dives, sites, tx
}

func TestDiveSiteServiceCreateRejectsNearbySameName(t *testing.T) {
	service, _, sites, tx := newDiveSiteServiceHarness()
	request := &models.DiveSiteRequest{Name: "Monterey Bay", Latitude: 36.6002, Longitude: -121.8947}
	existing := models.DiveSite{ID: 7, Name: request.Name, Latitude: 36.6003, Longitude: -121.8948}
	sites.On("FindDiveSitesByName", mock.Anything, request.Name).Return([]models.DiveSite{existing}, nil).Once()

	site, err := service.Create(context.Background(), request)

	assert.ErrorIs(t, err, utils.ErrDuplicateDiveSite)
	require.NotNil(t, site)
	assert.Equal(t, existing.ID, site.ID)
	assert.Equal(t, 1, tx.calls)
	sites.AssertNotCalled(t, "CreateDiveSite", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestDiveSiteServiceCreateAllowsSameNameAtDistantLocation(t *testing.T) {
	service, _, sites, _ := newDiveSiteServiceHarness()
	request := &models.DiveSiteRequest{Name: "Blue Hole", Latitude: 17.3156, Longitude: -87.5346}
	distant := models.DiveSite{ID: 3, Name: request.Name, Latitude: 28.5721, Longitude: -80.6480}
	created := &models.DiveSite{ID: 8, Name: request.Name, Latitude: request.Latitude, Longitude: request.Longitude}
	sites.On("FindDiveSitesByName", mock.Anything, request.Name).Return([]models.DiveSite{distant}, nil).Once()
	sites.On("CreateDiveSite", mock.Anything, request.Name, request.Latitude, request.Longitude, request.Description).Return(created, nil).Once()

	site, err := service.Create(context.Background(), request)

	require.NoError(t, err)
	assert.Equal(t, created, site)
	sites.AssertExpectations(t)
}

func TestDiveSiteServiceUpdateExcludesCurrentSiteFromDuplicateCheck(t *testing.T) {
	service, _, sites, _ := newDiveSiteServiceHarness()
	request := &models.DiveSiteRequest{Name: "Breakwater", Latitude: 36.6100, Longitude: -121.8900}
	current := models.DiveSite{ID: 12, Name: request.Name, Latitude: request.Latitude, Longitude: request.Longitude}
	updated := &models.DiveSite{ID: current.ID, Name: request.Name, Latitude: request.Latitude, Longitude: request.Longitude}
	sites.On("FindDiveSitesByName", mock.Anything, request.Name).Return([]models.DiveSite{current}, nil).Once()
	sites.On("UpdateDiveSite", mock.Anything, current.ID, request).Return(updated, nil).Once()

	site, err := service.Update(context.Background(), current.ID, request)

	require.NoError(t, err)
	assert.Equal(t, updated, site)
}

func TestDiveSiteServiceDeleteRejectsSiteInUse(t *testing.T) {
	service, _, sites, _ := newDiveSiteServiceHarness()
	sites.On("CountDivesBySiteID", mock.Anything, 21).Return(4, nil).Once()

	err := service.Delete(context.Background(), 21)

	assert.ErrorIs(t, err, utils.ErrDiveSiteInUse)
	sites.AssertNotCalled(t, "DeleteDiveSite", mock.Anything, mock.Anything)
}

func TestCalculateDistance(t *testing.T) {
	assert.InDelta(t, 3944, calculateDistance(40.7128, -74.0060, 34.0522, -118.2437), 60)
	assert.Zero(t, calculateDistance(40.7128, -74.0060, 40.7128, -74.0060))
	assert.Less(t, calculateDistance(40.7128, -74.0060, 40.7129, -74.0061), nearbyDiveSiteDistanceKM)
}
