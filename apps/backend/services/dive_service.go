package services

import (
	"context"
	"divelog-backend/models"
	"divelog-backend/utils"
)

// DiveRepository is the persistence contract used by DiveService.
type DiveRepository interface {
	GetDivesByUserID(context.Context, int) ([]models.Dive, error)
	CreateDive(context.Context, *models.Dive) error
	UpdateDive(context.Context, int, int, *models.Dive) error
	DeleteDive(context.Context, int, int) error
	DeleteAllDives(context.Context, int) (int64, error)
	GetCurrentDive(context.Context, int, int) (*models.Dive, error)
	CheckDuplicateDive(context.Context, int, int, string) (bool, error)
	CheckDuplicateDiveForUpdate(context.Context, int, int, string, int) (bool, error)
}

// DiveSiteRepository is the persistence contract used by dive write workflows.
type DiveSiteRepository interface {
	GetByID(context.Context, int) (*models.DiveSite, error)
	GetDiveSiteByDiveID(context.Context, int) (*int, error)
	FindDiveSitesByName(context.Context, string) ([]models.DiveSite, error)
	CreateDiveSite(context.Context, string, float64, float64, *string) (*models.DiveSite, error)
	UpdateDiveSite(context.Context, int, *models.DiveSiteRequest) (*models.DiveSite, error)
	CountDivesBySiteID(context.Context, int) (int, error)
	DeleteDiveSite(context.Context, int) error
}

// Transactor supplies transaction-bound repositories to a service workflow.
type Transactor interface {
	WithinTransaction(context.Context, func(DiveRepository, DiveSiteRepository) error) error
}

type DiveService struct {
	diveRepo   DiveRepository
	transactor Transactor
}

func NewDiveService(diveRepo DiveRepository, transactor Transactor) *DiveService {
	return &DiveService{diveRepo: diveRepo, transactor: transactor}
}

func (s *DiveService) GetDives(ctx context.Context, userID int) ([]models.Dive, error) {
	return s.diveRepo.GetDivesByUserID(ctx, userID)
}

func (s *DiveService) CreateDive(ctx context.Context, userID int, request models.DiveRequest) (*models.Dive, error) {
	dive := request.ToDive(userID)
	err := s.transactor.WithinTransaction(ctx, func(dives DiveRepository, sites DiveSiteRepository) error {
		site, err := findOrCreateDiveSite(ctx, sites, request.Location, request.Lat, request.Lng)
		if err != nil {
			return err
		}
		dive.DiveSiteID = &site.ID

		duplicate, err := dives.CheckDuplicateDive(ctx, userID, site.ID, request.DateTime)
		if err != nil {
			return err
		}
		if duplicate {
			return utils.ErrDuplicateDive
		}

		return dives.CreateDive(ctx, dive)
	})
	if err != nil {
		return nil, err
	}

	setDiveLocation(dive, request)
	return dive, nil
}

type SkippedDive struct {
	Date     string `json:"date"`
	Location string `json:"location"`
	Reason   string `json:"reason"`
}

type BatchCreateResult struct {
	Created []models.Dive
	Skipped []SkippedDive
}

func (s *DiveService) CreateMultipleDives(ctx context.Context, userID int, requests []models.DiveRequest) (*BatchCreateResult, error) {
	result := &BatchCreateResult{}
	err := s.transactor.WithinTransaction(ctx, func(dives DiveRepository, sites DiveSiteRepository) error {
		for _, request := range requests {
			dive := request.ToDive(userID)
			site, err := findOrCreateDiveSite(ctx, sites, request.Location, request.Lat, request.Lng)
			if err != nil {
				return err
			}
			dive.DiveSiteID = &site.ID

			duplicate, err := dives.CheckDuplicateDive(ctx, userID, site.ID, request.DateTime)
			if err != nil {
				return err
			}
			if duplicate {
				result.Skipped = append(result.Skipped, SkippedDive{
					Date: request.DateTime, Location: request.Location, Reason: "duplicate",
				})
				continue
			}

			if err := dives.CreateDive(ctx, dive); err != nil {
				return err
			}
			setDiveLocation(dive, request)
			result.Created = append(result.Created, *dive)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *DiveService) UpdateDive(ctx context.Context, diveID, userID int, request models.DiveRequest) (*models.Dive, error) {
	dive := request.ToDive(userID)
	err := s.transactor.WithinTransaction(ctx, func(dives DiveRepository, sites DiveSiteRepository) error {
		current, err := dives.GetCurrentDive(ctx, diveID, userID)
		if err != nil {
			return err
		}

		siteChanged := current.Location != request.Location || current.Latitude != request.Lat || current.Longitude != request.Lng
		dateTimeChanged := !current.DateTime.Time.Equal(dive.DateTime.Time)

		var site *models.DiveSite
		if siteChanged {
			site, err = findOrCreateDiveSite(ctx, sites, request.Location, request.Lat, request.Lng)
			if err != nil {
				return err
			}
		} else {
			site, err = existingOrResolvedSite(ctx, sites, diveID, request)
			if err != nil {
				return err
			}
		}
		if siteChanged || dateTimeChanged {
			duplicate, err := dives.CheckDuplicateDiveForUpdate(ctx, userID, site.ID, request.DateTime, diveID)
			if err != nil {
				return err
			}
			if duplicate {
				return utils.ErrDuplicateDive
			}
		}

		dive.DiveSiteID = &site.ID
		return dives.UpdateDive(ctx, diveID, userID, dive)
	})
	if err != nil {
		return nil, err
	}

	setDiveLocation(dive, request)
	return dive, nil
}

func (s *DiveService) DeleteDive(ctx context.Context, diveID, userID int) error {
	return s.diveRepo.DeleteDive(ctx, diveID, userID)
}

func (s *DiveService) DeleteAllDives(ctx context.Context, userID int) (int64, error) {
	return s.diveRepo.DeleteAllDives(ctx, userID)
}

func existingOrResolvedSite(ctx context.Context, sites DiveSiteRepository, diveID int, request models.DiveRequest) (*models.DiveSite, error) {
	siteID, err := sites.GetDiveSiteByDiveID(ctx, diveID)
	if err != nil {
		return nil, err
	}
	if siteID != nil {
		site, getErr := sites.GetByID(ctx, *siteID)
		if getErr == nil {
			return site, nil
		}
		if getErr != utils.ErrDiveSiteNotFound {
			return nil, getErr
		}
	}
	return findOrCreateDiveSite(ctx, sites, request.Location, request.Lat, request.Lng)
}

func setDiveLocation(dive *models.Dive, request models.DiveRequest) {
	dive.Location = request.Location
	dive.Latitude = request.Lat
	dive.Longitude = request.Lng
}
