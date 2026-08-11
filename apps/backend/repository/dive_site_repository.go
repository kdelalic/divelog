package repository

import (
	"context"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
)

type DiveSiteRepository struct {
	db dbExecutor
}

func NewDiveSiteRepository(db *sql.DB) *DiveSiteRepository {
	return &DiveSiteRepository{db: db}
}

func newDiveSiteRepository(db dbExecutor) *DiveSiteRepository {
	return &DiveSiteRepository{db: db}
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

// UpdateDiveSite persists an already validated dive site update.
func (r *DiveSiteRepository) UpdateDiveSite(ctx context.Context, id int, siteReq *models.DiveSiteRequest) (*models.DiveSite, error) {
	updateQuery := `UPDATE dive_sites 
					SET name = $1, latitude = $2, longitude = $3, description = $4, updated_at = NOW()
					WHERE id = $5
					RETURNING id, name, latitude, longitude, description, created_at, updated_at`

	var site models.DiveSite
	err := r.db.QueryRow(updateQuery, siteReq.Name, siteReq.Latitude, siteReq.Longitude, siteReq.Description, id).Scan(
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

func (r *DiveSiteRepository) CountDivesBySiteID(ctx context.Context, id int) (int, error) {
	var diveCount int
	err := r.db.QueryRow(`SELECT COUNT(*) FROM dives WHERE dive_site_id = $1`, id).Scan(&diveCount)
	if err != nil {
		utils.LogError(ctx, "Error checking dive site usage", err)
		return 0, utils.ErrDatabaseError
	}
	return diveCount, nil
}

// DeleteDiveSite deletes an already validated unused dive site.
func (r *DiveSiteRepository) DeleteDiveSite(ctx context.Context, id int) error {
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

func (r *DiveSiteRepository) FindDiveSitesByName(ctx context.Context, name string) ([]models.DiveSite, error) {
	rows, err := r.db.Query(
		`SELECT id, name, latitude, longitude, description, created_at, updated_at
		 FROM dive_sites WHERE LOWER(name) = LOWER($1)`,
		name,
	)
	if err != nil {
		utils.LogError(ctx, "Error finding dive sites by name", err)
		return nil, utils.ErrDatabaseError
	}
	defer rows.Close()

	var sites []models.DiveSite
	for rows.Next() {
		site, err := r.scanDiveSite(rows)
		if err != nil {
			utils.LogError(ctx, "Error scanning dive site by name", err)
			return nil, utils.ErrDatabaseError
		}
		sites = append(sites, *site)
	}
	if err := rows.Err(); err != nil {
		utils.LogError(ctx, "Error iterating dive sites by name", err)
		return nil, utils.ErrDatabaseError
	}
	return sites, nil
}

func (r *DiveSiteRepository) CreateDiveSite(ctx context.Context, name string, latitude, longitude float64, description *string) (*models.DiveSite, error) {
	insertQuery := `INSERT INTO dive_sites (name, latitude, longitude, description, created_at, updated_at)
				   VALUES ($1, $2, $3, $4, NOW(), NOW())
				   RETURNING id, name, latitude, longitude, description, created_at, updated_at`

	var newSite models.DiveSite
	err := r.db.QueryRow(insertQuery, name, latitude, longitude, description).Scan(
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
