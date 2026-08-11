package services

import (
	"context"
	"divelog-backend/models"
	"divelog-backend/utils"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

type mockDiveRepository struct{ mock.Mock }

func (m *mockDiveRepository) GetDivesByUserID(ctx context.Context, userID int) ([]models.Dive, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).([]models.Dive), args.Error(1)
}
func (m *mockDiveRepository) CreateDive(ctx context.Context, dive *models.Dive) error {
	return m.Called(ctx, dive).Error(0)
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
func (m *mockDiveRepository) CheckDuplicateDive(ctx context.Context, userID, siteID int, dateTime string) (bool, error) {
	args := m.Called(ctx, userID, siteID, dateTime)
	return args.Bool(0), args.Error(1)
}
func (m *mockDiveRepository) CheckDuplicateDiveForUpdate(ctx context.Context, userID, siteID int, dateTime string, excludeID int) (bool, error) {
	args := m.Called(ctx, userID, siteID, dateTime, excludeID)
	return args.Bool(0), args.Error(1)
}

type mockDiveSiteRepository struct{ mock.Mock }

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
func (m *mockDiveSiteRepository) GetDiveSiteByDiveID(ctx context.Context, id int) (*int, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*int), args.Error(1)
}
func (m *mockDiveSiteRepository) FindDiveSitesByName(ctx context.Context, name string) ([]models.DiveSite, error) {
	args := m.Called(ctx, name)
	return args.Get(0).([]models.DiveSite), args.Error(1)
}
func (m *mockDiveSiteRepository) CreateDiveSite(ctx context.Context, name string, lat, lng float64, description *string) (*models.DiveSite, error) {
	args := m.Called(ctx, name, lat, lng, description)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.DiveSite), args.Error(1)
}
func (m *mockDiveSiteRepository) UpdateDiveSite(ctx context.Context, id int, request *models.DiveSiteRequest) (*models.DiveSite, error) {
	args := m.Called(ctx, id, request)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.DiveSite), args.Error(1)
}
func (m *mockDiveSiteRepository) CountDivesBySiteID(ctx context.Context, id int) (int, error) {
	args := m.Called(ctx, id)
	return args.Int(0), args.Error(1)
}
func (m *mockDiveSiteRepository) DeleteDiveSite(ctx context.Context, id int) error {
	return m.Called(ctx, id).Error(0)
}

type recordingTransactor struct {
	dives DiveRepository
	sites DiveSiteRepository
	calls int
}

func (t *recordingTransactor) WithinTransaction(ctx context.Context, operation func(DiveRepository, DiveSiteRepository) error) error {
	t.calls++
	return operation(t.dives, t.sites)
}

func serviceTestRequest() models.DiveRequest {
	return models.DiveRequest{
		DateTime: "2026-08-10T09:30:00Z", Location: "Monterey Bay",
		Depth: 24.5, Duration: 47, Lat: 36.6002, Lng: -121.8947,
	}
}

func newServiceTestHarness() (*DiveService, *mockDiveRepository, *mockDiveSiteRepository, *recordingTransactor) {
	dives := new(mockDiveRepository)
	sites := new(mockDiveSiteRepository)
	tx := &recordingTransactor{dives: dives, sites: sites}
	return NewDiveService(dives, tx), dives, sites, tx
}

func TestDiveServiceCreateDiveRunsWorkflowInTransaction(t *testing.T) {
	service, dives, sites, tx := newServiceTestHarness()
	request := serviceTestRequest()
	site := &models.DiveSite{ID: 17, Name: request.Location}

	sites.On("FindDiveSitesByName", mock.Anything, request.Location).Return([]models.DiveSite{}, nil).Once()
	sites.On("CreateDiveSite", mock.Anything, request.Location, request.Lat, request.Lng, (*string)(nil)).Return(site, nil).Once()
	dives.On("CheckDuplicateDive", mock.Anything, 42, site.ID, request.DateTime).Return(false, nil).Once()
	dives.On("CreateDive", mock.Anything, mock.MatchedBy(func(dive *models.Dive) bool {
		return dive.UserID == 42 && dive.DiveSiteID != nil && *dive.DiveSiteID == site.ID
	})).Run(func(args mock.Arguments) {
		args.Get(1).(*models.Dive).ID = 99
	}).Return(nil).Once()

	created, err := service.CreateDive(context.Background(), 42, request)

	require.NoError(t, err)
	assert.Equal(t, 1, tx.calls)
	assert.Equal(t, 99, created.ID)
	assert.Equal(t, request.Location, created.Location)
	assert.Equal(t, request.Lat, created.Latitude)
	dives.AssertExpectations(t)
	sites.AssertExpectations(t)
}

func TestDiveServiceCreateDiveStopsOnDuplicate(t *testing.T) {
	service, dives, sites, _ := newServiceTestHarness()
	request := serviceTestRequest()
	site := &models.DiveSite{ID: 17, Latitude: request.Lat, Longitude: request.Lng}
	sites.On("FindDiveSitesByName", mock.Anything, request.Location).Return([]models.DiveSite{*site}, nil).Once()
	dives.On("CheckDuplicateDive", mock.Anything, 42, site.ID, request.DateTime).Return(true, nil).Once()

	created, err := service.CreateDive(context.Background(), 42, request)

	assert.Nil(t, created)
	assert.ErrorIs(t, err, utils.ErrDuplicateDive)
	dives.AssertNotCalled(t, "CreateDive", mock.Anything, mock.Anything)
}

func TestDiveServiceBatchCreatesAndSkipsInOneTransaction(t *testing.T) {
	service, dives, sites, tx := newServiceTestHarness()
	first := serviceTestRequest()
	second := serviceTestRequest()
	second.DateTime = "2026-08-10T12:30:00Z"
	second.Location = "Breakwater"
	firstSite := &models.DiveSite{ID: 4}
	secondSite := &models.DiveSite{ID: 5}

	sites.On("FindDiveSitesByName", mock.Anything, first.Location).Return([]models.DiveSite{}, nil).Once()
	sites.On("CreateDiveSite", mock.Anything, first.Location, first.Lat, first.Lng, (*string)(nil)).Return(firstSite, nil).Once()
	dives.On("CheckDuplicateDive", mock.Anything, 8, firstSite.ID, first.DateTime).Return(true, nil).Once()
	sites.On("FindDiveSitesByName", mock.Anything, second.Location).Return([]models.DiveSite{}, nil).Once()
	sites.On("CreateDiveSite", mock.Anything, second.Location, second.Lat, second.Lng, (*string)(nil)).Return(secondSite, nil).Once()
	dives.On("CheckDuplicateDive", mock.Anything, 8, secondSite.ID, second.DateTime).Return(false, nil).Once()
	dives.On("CreateDive", mock.Anything, mock.AnythingOfType("*models.Dive")).Run(func(args mock.Arguments) {
		args.Get(1).(*models.Dive).ID = 23
	}).Return(nil).Once()

	result, err := service.CreateMultipleDives(context.Background(), 8, []models.DiveRequest{first, second})

	require.NoError(t, err)
	assert.Equal(t, 1, tx.calls)
	require.Len(t, result.Created, 1)
	assert.Equal(t, 23, result.Created[0].ID)
	require.Len(t, result.Skipped, 1)
	assert.Equal(t, first.Location, result.Skipped[0].Location)
	assert.Equal(t, "duplicate", result.Skipped[0].Reason)
}

func TestDiveServiceUpdateReusesExistingSiteWhenLocationAndDateAreUnchanged(t *testing.T) {
	service, dives, sites, _ := newServiceTestHarness()
	request := serviceTestRequest()
	current := &models.Dive{
		DateTime: models.LocalTime{Time: time.Date(2026, 8, 10, 9, 30, 0, 0, time.UTC)},
		Location: request.Location, Latitude: request.Lat, Longitude: request.Lng,
	}
	siteID := 11
	site := &models.DiveSite{ID: siteID}

	dives.On("GetCurrentDive", mock.Anything, 30, 42).Return(current, nil).Once()
	sites.On("GetDiveSiteByDiveID", mock.Anything, 30).Return(&siteID, nil).Once()
	sites.On("GetByID", mock.Anything, siteID).Return(site, nil).Once()
	dives.On("UpdateDive", mock.Anything, 30, 42, mock.MatchedBy(func(dive *models.Dive) bool {
		return dive.DiveSiteID != nil && *dive.DiveSiteID == siteID
	})).Return(nil).Once()

	updated, err := service.UpdateDive(context.Background(), 30, 42, request)

	require.NoError(t, err)
	assert.Equal(t, siteID, *updated.DiveSiteID)
	sites.AssertNotCalled(t, "FindDiveSitesByName", mock.Anything, mock.Anything)
	dives.AssertNotCalled(t, "CheckDuplicateDiveForUpdate", mock.Anything, mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}

func TestDiveServiceUpdateChecksExactTimestampWhenTimeChanges(t *testing.T) {
	service, dives, sites, _ := newServiceTestHarness()
	request := serviceTestRequest()
	current := &models.Dive{
		DateTime: models.LocalTime{Time: time.Date(2026, 8, 10, 8, 0, 0, 0, time.UTC)},
		Location: request.Location, Latitude: request.Lat, Longitude: request.Lng,
	}
	siteID := 11
	site := &models.DiveSite{ID: siteID}

	dives.On("GetCurrentDive", mock.Anything, 30, 42).Return(current, nil).Once()
	sites.On("GetDiveSiteByDiveID", mock.Anything, 30).Return(&siteID, nil).Once()
	sites.On("GetByID", mock.Anything, siteID).Return(site, nil).Once()
	dives.On("CheckDuplicateDiveForUpdate", mock.Anything, 42, siteID, request.DateTime, 30).Return(true, nil).Once()

	updated, err := service.UpdateDive(context.Background(), 30, 42, request)

	assert.Nil(t, updated)
	assert.ErrorIs(t, err, utils.ErrDuplicateDive)
	dives.AssertNotCalled(t, "UpdateDive", mock.Anything, mock.Anything, mock.Anything, mock.Anything)
}
