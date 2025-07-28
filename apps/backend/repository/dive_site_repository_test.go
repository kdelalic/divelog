package repository

import (
	"context"
	"database/sql"
	"divelog-backend/models"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
)

func TestDiveSiteRepository_FindOrCreateDiveSite(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	
	// Test creating a new dive site
	site, err := repo.FindOrCreateDiveSite(ctx, "Test Site", 40.7128, -74.0060)
	assert.NoError(t, err)
	assert.NotNil(t, site)
	assert.Equal(t, "Test Site", site.Name)
	assert.Equal(t, 40.7128, site.Latitude)
	assert.Equal(t, -74.0060, site.Longitude)
	assert.NotZero(t, site.ID)
}

func TestDiveSiteRepository_GetAll(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	
	sites, err := repo.GetAll(ctx)
	assert.NoError(t, err)
	assert.NotNil(t, sites)
	// Should return empty slice, not nil
	assert.IsType(t, []models.DiveSite{}, sites)
}

func TestDiveSiteRepository_Search(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	
	sites, err := repo.Search(ctx, "test")
	assert.NoError(t, err)
	assert.NotNil(t, sites)
	assert.IsType(t, []models.DiveSite{}, sites)
}

func TestDiveSiteRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	
	// Test getting non-existent site
	site, err := repo.GetByID(ctx, 999999)
	assert.Error(t, err)
	assert.Nil(t, site)
}

func TestDiveSiteRepository_Create(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	
	siteReq := &models.DiveSiteRequest{
		Name:        "New Test Site",
		Latitude:    40.7500,
		Longitude:   -73.9857,
		Description: "A test dive site",
	}
	
	site, err := repo.Create(ctx, siteReq)
	assert.NoError(t, err)
	assert.NotNil(t, site)
	assert.Equal(t, siteReq.Name, site.Name)
}

func TestDiveSiteRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	
	// Test updating non-existent site
	siteReq := &models.DiveSiteRequest{
		Name:        "Updated Site",
		Latitude:    40.7500,
		Longitude:   -73.9857,
		Description: "Updated description",
	}
	
	site, err := repo.Update(ctx, 999999, siteReq)
	assert.Error(t, err)
	assert.Nil(t, site)
}

func TestDiveSiteRepository_Delete(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	
	// Test deleting non-existent site
	err := repo.Delete(ctx, 999999)
	assert.Error(t, err)
}

func TestDiveSiteRepository_GetDiveSiteByDiveID(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	
	// Test getting dive site for non-existent dive
	siteID, err := repo.GetDiveSiteByDiveID(ctx, 999999)
	assert.Error(t, err)
	assert.Nil(t, siteID)
}

// Unit test for distance calculation
func TestCalculateDistance(t *testing.T) {
	// Test distance between New York and Los Angeles (approximate)
	distance := calculateDistance(40.7128, -74.0060, 34.0522, -118.2437)
	
	// Distance should be approximately 3944 km
	assert.Greater(t, distance, 3900.0)
	assert.Less(t, distance, 4000.0)
}

func TestCalculateDistance_SameLocation(t *testing.T) {
	// Distance between same coordinates should be 0
	distance := calculateDistance(40.7128, -74.0060, 40.7128, -74.0060)
	assert.Equal(t, 0.0, distance)
}

func TestCalculateDistance_CloseLocations(t *testing.T) {
	// Test locations within 100m (0.1 km)
	distance := calculateDistance(40.7128, -74.0060, 40.7129, -74.0061)
	assert.Less(t, distance, 0.1)
}