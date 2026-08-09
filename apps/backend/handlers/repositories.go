package handlers

import (
	"context"
	"divelog-backend/models"
)

type diveRepository interface {
	GetDivesByUserID(context.Context, int) ([]models.Dive, error)
	CreateDive(context.Context, *models.Dive) error
	CreateMultipleDives(context.Context, []*models.Dive) ([]models.Dive, []map[string]interface{}, error)
	UpdateDive(context.Context, int, int, *models.Dive) error
	DeleteDive(context.Context, int, int) error
	DeleteAllDives(context.Context, int) (int64, error)
	GetCurrentDive(context.Context, int, int) (*models.Dive, error)
	CheckDuplicateDive(context.Context, int, int, string) (bool, error)
	CheckDuplicateDiveForUpdateByLocation(context.Context, int, float64, float64, string, int) (bool, error)
}

type diveSiteRepository interface {
	FindOrCreateDiveSite(context.Context, string, float64, float64) (*models.DiveSite, error)
	GetAll(context.Context) ([]models.DiveSite, error)
	Search(context.Context, string) ([]models.DiveSite, error)
	GetByID(context.Context, int) (*models.DiveSite, error)
	Create(context.Context, *models.DiveSiteRequest) (*models.DiveSite, error)
	Update(context.Context, int, *models.DiveSiteRequest) (*models.DiveSite, error)
	Delete(context.Context, int) error
	GetDiveSiteByDiveID(context.Context, int) (*int, error)
}

type settingsRepository interface {
	GetOrCreateDefault(context.Context, int) (*models.UserSettings, error)
	GetByUserID(context.Context, int) (*models.UserSettings, error)
	Update(context.Context, *models.UserSettings) error
}
