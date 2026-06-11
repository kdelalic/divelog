package handlers

import (
	"context"
	"divelog-backend/models"
)

// DiveRepository defines the dive persistence operations used by DiveHandler.
type DiveRepository interface {
	GetDivesByUserID(ctx context.Context, userID int) ([]models.Dive, error)
	CreateDive(ctx context.Context, dive *models.Dive) error
	CreateMultipleDives(ctx context.Context, dives []*models.Dive) ([]models.Dive, []map[string]interface{}, error)
	UpdateDive(ctx context.Context, diveID, userID int, dive *models.Dive) error
	DeleteDive(ctx context.Context, diveID, userID int) error
	GetCurrentDive(ctx context.Context, diveID, userID int) (*models.Dive, error)
	CheckDuplicateDive(ctx context.Context, userID int, diveSiteID int, diveDateTime string) (bool, error)
	CheckDuplicateDiveForUpdateByLocation(ctx context.Context, userID int, latitude, longitude float64, diveDateTime string, excludeDiveID int) (bool, error)
}

// DiveSiteResolver defines the dive site operations used by DiveHandler.
type DiveSiteResolver interface {
	FindOrCreateDiveSite(ctx context.Context, name string, latitude, longitude float64) (*models.DiveSite, error)
	GetByID(ctx context.Context, id int) (*models.DiveSite, error)
	GetDiveSiteByDiveID(ctx context.Context, diveID int) (*int, error)
}

// DiveSiteRepository defines the dive site operations used by DiveSiteHandler.
type DiveSiteRepository interface {
	DiveSiteResolver
	GetAll(ctx context.Context) ([]models.DiveSite, error)
	Search(ctx context.Context, query string) ([]models.DiveSite, error)
	Create(ctx context.Context, siteReq *models.DiveSiteRequest) (*models.DiveSite, error)
	Update(ctx context.Context, id int, siteReq *models.DiveSiteRequest) (*models.DiveSite, error)
	Delete(ctx context.Context, id int) error
}

// SettingsRepository defines the settings persistence operations used by SettingsHandler.
type SettingsRepository interface {
	GetOrCreateDefault(ctx context.Context, userID int) (*models.UserSettings, error)
	GetByUserID(ctx context.Context, userID int) (*models.UserSettings, error)
	Update(ctx context.Context, settings *models.UserSettings) error
}
