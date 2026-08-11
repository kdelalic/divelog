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
