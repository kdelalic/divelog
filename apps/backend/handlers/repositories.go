package handlers

import (
	"context"
	"divelog-backend/models"
	"divelog-backend/services"
)

type diveService interface {
	GetDives(context.Context, int) ([]models.Dive, error)
	CreateDive(context.Context, int, models.DiveRequest) (*models.Dive, error)
	CreateMultipleDives(context.Context, int, []models.DiveRequest) (*services.BatchCreateResult, error)
	UpdateDive(context.Context, int, int, models.DiveRequest) (*models.Dive, error)
	DeleteDive(context.Context, int, int) error
	DeleteAllDives(context.Context, int) (int64, error)
}

type diveSiteService interface {
	GetAll(context.Context) ([]models.DiveSite, error)
	Search(context.Context, string) ([]models.DiveSite, error)
	GetByID(context.Context, int) (*models.DiveSite, error)
	Create(context.Context, *models.DiveSiteRequest) (*models.DiveSite, error)
	Update(context.Context, int, *models.DiveSiteRequest) (*models.DiveSite, error)
	Delete(context.Context, int) error
}

type settingsRepository interface {
	GetOrCreateDefault(context.Context, int) (*models.UserSettings, error)
	GetByUserID(context.Context, int) (*models.UserSettings, error)
	Update(context.Context, *models.UserSettings) error
}

type logbookService interface {
	GetTags(context.Context, int) ([]models.TagSummary, error)
	CreateTag(context.Context, int, models.TagRequest) (*models.TagSummary, error)
	UpdateTag(context.Context, int, int, models.TagRequest) (*models.TagSummary, error)
	DeleteTag(context.Context, int, int) error
	GetTrips(context.Context, int) ([]models.Trip, error)
	CreateTrip(context.Context, int, models.TripRequest) (*models.Trip, error)
	UpdateTrip(context.Context, int, int, models.TripRequest) (*models.Trip, error)
	DeleteTrip(context.Context, int, int) error
	MergeTrips(context.Context, int, int, models.MergeTripsRequest) error
	SplitTrip(context.Context, int, int, models.SplitTripRequest) (*models.Trip, error)
	RenumberDives(context.Context, int, models.RenumberDivesRequest) (int64, error)
	BulkUpdateDives(context.Context, int, models.BulkDiveUpdateRequest) (int64, error)
	BulkDeleteDives(context.Context, int, models.BulkDiveDeleteRequest) (int64, error)
	ShiftDiveTimes(context.Context, int, models.ShiftDiveTimesRequest) (*models.BulkOperation, error)
	LatestUndoableOperation(context.Context, int) (*models.BulkOperation, error)
	UndoBulkOperation(context.Context, int, string) (*models.BulkOperation, error)
}
