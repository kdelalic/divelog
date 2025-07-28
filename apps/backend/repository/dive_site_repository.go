package repository

import (
	"context"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
	"math"
)

type DiveSiteRepository struct {
	db *sql.DB
}

func NewDiveSiteRepository(db *sql.DB) *DiveSiteRepository {
	return &DiveSiteRepository{db: db}
}

// FindOrCreateDiveSite finds an existing dive site or creates a new one
func (r *DiveSiteRepository) FindOrCreateDiveSite(ctx context.Context, name string, latitude, longitude float64) (*models.DiveSite, error) {
	// Try to find an existing dive site with the same name and close coordinates
	var existingSite models.DiveSite
	query := `SELECT id, name, latitude, longitude, description, created_at, updated_at 
			  FROM dive_sites WHERE LOWER(name) = LOWER($1)`

	err := r.db.QueryRow(query, name).Scan(
		&existingSite.ID, &existingSite.Name, &existingSite.Latitude,
		&existingSite.Longitude, &existingSite.Description,
		&existingSite.CreatedAt, &existingSite.UpdatedAt,
	)

	if err == nil {
		// Found existing site with same name
		// Check if coordinates are reasonably close (within ~100m)
		distance := calculateDistance(existingSite.Latitude, existingSite.Longitude, latitude, longitude)
		if distance < 0.1 { // Less than 100 meters
			return &existingSite, nil
		}
		// Name exists but coordinates are far - create new site (different location with same name)
	}

	// No matching site found, create a new one
	return r.createDiveSite(ctx, name, latitude, longitude)
}

// GetAll returns all dive sites
func (r *DiveSiteRepository) GetAll(ctx context.Context) ([]models.DiveSite, error) {
	query := `SELECT id, name, latitude, longitude, description, created_at, updated_at 
			  FROM dive_sites ORDER BY name`

	rows, err := r.db.Query(query)
	if err != nil {
		utils.LogError(ctx, "Error querying dive sites", err)
		return nil, utils.ErrDatabaseError
	}
	defer rows.Close()

	var sites []models.DiveSite
	for rows.Next() {
		site, err := r.scanDiveSite(rows)
		if err != nil {
			utils.LogError(ctx, "Error scanning dive site", err)
			continue
		}
		sites = append(sites, *site)
	}

	return sites, nil
}

// Search searches for dive sites by name
func (r *DiveSiteRepository) Search(ctx context.Context, query string) ([]models.DiveSite, error) {
	searchQuery := `SELECT id, name, latitude, longitude, description, created_at, updated_at 
					FROM dive_sites 
					WHERE LOWER(name) LIKE LOWER($1) 
					ORDER BY name
					LIMIT 10`

	rows, err := r.db.Query(searchQuery, "%"+query+"%")
	if err != nil {
		utils.LogError(ctx, "Error searching dive sites", err)
		return nil, utils.ErrDatabaseError
	}
	defer rows.Close()

	var sites []models.DiveSite
	for rows.Next() {
		site, err := r.scanDiveSite(rows)
		if err != nil {
			utils.LogError(ctx, "Error scanning dive site", err)
			continue
		}
		sites = append(sites, *site)
	}

	return sites, nil
}

// GetByID returns a specific dive site
func (r *DiveSiteRepository) GetByID(ctx context.Context, id int) (*models.DiveSite, error) {
	query := `SELECT id, name, latitude, longitude, description, created_at, updated_at 
			  FROM dive_sites WHERE id = $1`

	var site models.DiveSite
	err := r.db.QueryRow(query, id).Scan(
		&site.ID, &site.Name, &site.Latitude, &site.Longitude,
		&site.Description, &site.CreatedAt, &site.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.ErrDiveSiteNotFound
		}
		utils.LogError(ctx, "Error getting dive site", err)
		return nil, utils.ErrDatabaseError
	}

	return &site, nil
}

// Create creates a new dive site
func (r *DiveSiteRepository) Create(ctx context.Context, siteReq *models.DiveSiteRequest) (*models.DiveSite, error) {
	// Check if a dive site with the same name and close coordinates already exists
	existingSite, err := r.FindOrCreateDiveSite(ctx, siteReq.Name, siteReq.Latitude, siteReq.Longitude)
	if err != nil {
		return nil, err
	}

	// Check if this is actually a new site or an existing one
	distance := calculateDistance(existingSite.Latitude, existingSite.Longitude, siteReq.Latitude, siteReq.Longitude)
	if distance < 0.1 && existingSite.Name == siteReq.Name {
		// This is essentially the same site
		return nil, utils.ErrDuplicateDive // Reusing error for similar concept
	}

	return existingSite, nil
}

// Update updates an existing dive site
func (r *DiveSiteRepository) Update(ctx context.Context, id int, siteReq *models.DiveSiteRequest) (*models.DiveSite, error) {
	// Check if another dive site with the same name and close coordinates exists (excluding current one)
	checkQuery := `SELECT id FROM dive_sites 
				   WHERE LOWER(name) = LOWER($1) AND id != $2`

	var existingID int
	err := r.db.QueryRow(checkQuery, siteReq.Name, id).Scan(&existingID)
	if err == nil {
		// Found another site with same name, check distance
		var existingLat, existingLng float64
		err = r.db.QueryRow(`SELECT latitude, longitude FROM dive_sites WHERE id = $1`, existingID).Scan(&existingLat, &existingLng)
		if err == nil {
			distance := calculateDistance(existingLat, existingLng, siteReq.Latitude, siteReq.Longitude)
			if distance < 0.1 {
				return nil, utils.ErrDuplicateDive
			}
		}
	}

	// Update the dive site
	updateQuery := `UPDATE dive_sites 
					SET name = $1, latitude = $2, longitude = $3, description = $4, updated_at = NOW()
					WHERE id = $5
					RETURNING id, name, latitude, longitude, description, created_at, updated_at`

	var site models.DiveSite
	err = r.db.QueryRow(updateQuery, siteReq.Name, siteReq.Latitude, siteReq.Longitude, siteReq.Description, id).Scan(
		&site.ID, &site.Name, &site.Latitude, &site.Longitude,
		&site.Description, &site.CreatedAt, &site.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.ErrDiveSiteNotFound
		}
		utils.LogError(ctx, "Error updating dive site", err)
		return nil, utils.ErrDatabaseError
	}

	return &site, nil
}

// Delete deletes a dive site (only if no dives reference it)
func (r *DiveSiteRepository) Delete(ctx context.Context, id int) error {
	// Check if any dives reference this dive site
	var diveCount int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM dives WHERE dive_site_id = $1`, id).Scan(&diveCount)
	if err != nil {
		utils.LogError(ctx, "Error checking dive site usage", err)
		return utils.ErrDatabaseError
	}

	if diveCount > 0 {
		return utils.ErrProcessingFailed // Could create a more specific error
	}

	// Delete the dive site
	deleteQuery := `DELETE FROM dive_sites WHERE id = $1`
	result, err := r.db.Exec(deleteQuery, id)
	if err != nil {
		utils.LogError(ctx, "Error deleting dive site", err)
		return utils.ErrDatabaseError
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		utils.LogError(ctx, "Error getting rows affected", err)
		return utils.ErrDatabaseError
	}

	if rowsAffected == 0 {
		return utils.ErrDiveSiteNotFound
	}

	return nil
}

// GetDiveSiteByDiveID gets the dive site ID for a specific dive
func (r *DiveSiteRepository) GetDiveSiteByDiveID(ctx context.Context, diveID int) (*int, error) {
	var diveSiteID *int
	err := r.db.QueryRow(`SELECT dive_site_id FROM dives WHERE id = $1`, diveID).Scan(&diveSiteID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.ErrDiveNotFound
		}
		return nil, utils.ErrDatabaseError
	}
	return diveSiteID, nil
}

// createDiveSite creates a new dive site
func (r *DiveSiteRepository) createDiveSite(ctx context.Context, name string, latitude, longitude float64) (*models.DiveSite, error) {
	insertQuery := `INSERT INTO dive_sites (name, latitude, longitude, created_at, updated_at)
					VALUES ($1, $2, $3, NOW(), NOW())
					RETURNING id, name, latitude, longitude, description, created_at, updated_at`

	var newSite models.DiveSite
	err := r.db.QueryRow(insertQuery, name, latitude, longitude).Scan(
		&newSite.ID, &newSite.Name, &newSite.Latitude,
		&newSite.Longitude, &newSite.Description,
		&newSite.CreatedAt, &newSite.UpdatedAt,
	)

	if err != nil {
		return nil, utils.ErrDatabaseError
	}

	return &newSite, nil
}

// scanDiveSite scans a dive site from database rows
func (r *DiveSiteRepository) scanDiveSite(rows *sql.Rows) (*models.DiveSite, error) {
	var site models.DiveSite
	err := rows.Scan(
		&site.ID, &site.Name, &site.Latitude, &site.Longitude,
		&site.Description, &site.CreatedAt, &site.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &site, nil
}

// calculateDistance calculates the distance between two coordinates in kilometers
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth's radius in kilometers

	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}
