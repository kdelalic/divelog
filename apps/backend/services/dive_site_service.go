package services

import (
	"context"
	"divelog-backend/models"
	"divelog-backend/utils"
	"math"
)

const nearbyDiveSiteDistanceKM = 0.1

type DiveSiteCRUDRepository interface {
	DiveSiteRepository
	GetAll(context.Context) ([]models.DiveSite, error)
	Search(context.Context, string) ([]models.DiveSite, error)
}

type DiveSiteService struct {
	repo       DiveSiteCRUDRepository
	transactor Transactor
}

func NewDiveSiteService(repo DiveSiteCRUDRepository, transactor Transactor) *DiveSiteService {
	return &DiveSiteService{repo: repo, transactor: transactor}
}

func (s *DiveSiteService) GetAll(ctx context.Context) ([]models.DiveSite, error) {
	return s.repo.GetAll(ctx)
}

func (s *DiveSiteService) Search(ctx context.Context, query string) ([]models.DiveSite, error) {
	return s.repo.Search(ctx, query)
}

func (s *DiveSiteService) GetByID(ctx context.Context, id int) (*models.DiveSite, error) {
	return s.repo.GetByID(ctx, id)
}

func (s *DiveSiteService) Create(ctx context.Context, request *models.DiveSiteRequest) (*models.DiveSite, error) {
	var site *models.DiveSite
	err := s.transactor.WithinTransaction(ctx, func(_ DiveRepository, sites DiveSiteRepository) error {
		existing, err := findNearbyDiveSite(ctx, sites, request.Name, request.Latitude, request.Longitude, 0)
		if err != nil {
			return err
		}
		if existing != nil {
			site = existing
			return utils.ErrDuplicateDiveSite
		}
		site, err = sites.CreateDiveSite(ctx, request.Name, request.Latitude, request.Longitude, request.Description)
		return err
	})
	return site, err
}

func (s *DiveSiteService) Update(ctx context.Context, id int, request *models.DiveSiteRequest) (*models.DiveSite, error) {
	var site *models.DiveSite
	err := s.transactor.WithinTransaction(ctx, func(_ DiveRepository, sites DiveSiteRepository) error {
		existing, err := findNearbyDiveSite(ctx, sites, request.Name, request.Latitude, request.Longitude, id)
		if err != nil {
			return err
		}
		if existing != nil {
			return utils.ErrDuplicateDiveSite
		}
		site, err = sites.UpdateDiveSite(ctx, id, request)
		return err
	})
	return site, err
}

func (s *DiveSiteService) Delete(ctx context.Context, id int) error {
	return s.transactor.WithinTransaction(ctx, func(_ DiveRepository, sites DiveSiteRepository) error {
		count, err := sites.CountDivesBySiteID(ctx, id)
		if err != nil {
			return err
		}
		if count > 0 {
			return utils.ErrDiveSiteInUse
		}
		return sites.DeleteDiveSite(ctx, id)
	})
}

func findOrCreateDiveSite(ctx context.Context, sites DiveSiteRepository, name string, latitude, longitude float64) (*models.DiveSite, error) {
	existing, err := findNearbyDiveSite(ctx, sites, name, latitude, longitude, 0)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}
	return sites.CreateDiveSite(ctx, name, latitude, longitude, nil)
}

func findNearbyDiveSite(ctx context.Context, sites DiveSiteRepository, name string, latitude, longitude float64, excludeID int) (*models.DiveSite, error) {
	candidates, err := sites.FindDiveSitesByName(ctx, name)
	if err != nil {
		return nil, err
	}
	for i := range candidates {
		candidate := &candidates[i]
		if candidate.ID != excludeID && calculateDistance(candidate.Latitude, candidate.Longitude, latitude, longitude) < nearbyDiveSiteDistanceKM {
			return candidate, nil
		}
	}
	return nil, nil
}

func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const earthRadiusKM = 6371
	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180
	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)
	return earthRadiusKM * 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
}
