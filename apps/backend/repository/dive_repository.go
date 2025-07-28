package repository

import (
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
	"log"
	"time"
)

type DiveRepository struct {
	db *sql.DB
}

func NewDiveRepository(db *sql.DB) *DiveRepository {
	return &DiveRepository{db: db}
}

// GetDivesByUserID retrieves all dives for a user
func (r *DiveRepository) GetDivesByUserID(userID int) ([]models.Dive, error) {
	query := `
		SELECT 
			d.id, d.user_id, d.dive_site_id, d.dive_datetime, d.max_depth, d.duration, 
			d.buddy, d.water_temperature, d.visibility, d.notes, d.samples, d.equipment, d.created_at, d.updated_at,
			COALESCE(ds.latitude, d.latitude, 0.0) as latitude,
			COALESCE(ds.longitude, d.longitude, 0.0) as longitude,
			COALESCE(ds.name, d.location, 'Unknown Location') as location
		FROM dives d
		LEFT JOIN dive_sites ds ON d.dive_site_id = ds.id
		WHERE d.user_id = $1
		ORDER BY d.dive_datetime DESC, d.created_at DESC
	`

	rows, err := r.db.Query(query, userID)
	if err != nil {
		log.Printf("Error querying dives: %v", err)
		return nil, utils.ErrDatabaseError
	}
	defer rows.Close()

	var dives []models.Dive
	for rows.Next() {
		dive, err := r.scanDive(rows)
		if err != nil {
			log.Printf("Error scanning dive: %v", err)
			continue
		}
		dives = append(dives, *dive)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating over dives: %v", err)
		return nil, utils.ErrDatabaseError
	}

	return dives, nil
}

// CreateDive creates a new dive
func (r *DiveRepository) CreateDive(dive *models.Dive) error {
	// Serialize samples to JSON
	samplesJSON, err := utils.MarshalJSON(dive.Samples)
	if err != nil {
		log.Printf("Error marshaling samples: %v", err)
		return utils.ErrProcessingFailed
	}

	// Serialize equipment to JSON
	equipmentJSON, err := utils.MarshalJSON(dive.Equipment)
	if err != nil {
		log.Printf("Error marshaling equipment: %v", err)
		return utils.ErrProcessingFailed
	}

	query := `
		INSERT INTO dives (user_id, dive_site_id, dive_datetime, max_depth, duration, buddy, latitude, longitude, location, water_temperature, visibility, notes, samples, equipment, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	err = r.db.QueryRow(
		query,
		dive.UserID, dive.DiveSiteID, dive.DateTime, dive.MaxDepth, dive.Duration,
		dive.Buddy, dive.Latitude, dive.Longitude, dive.Location,
		dive.WaterTemp, dive.Visibility, dive.Notes, samplesJSON, equipmentJSON,
		now, now,
	).Scan(&dive.ID, &dive.CreatedAt, &dive.UpdatedAt)

	if err != nil {
		log.Printf("Error creating dive: %v", err)
		return utils.ErrDatabaseError
	}

	return nil
}

// CreateMultipleDives creates multiple dives in a transaction
func (r *DiveRepository) CreateMultipleDives(dives []*models.Dive) ([]models.Dive, []map[string]interface{}, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return nil, nil, utils.ErrDatabaseError
	}
	defer tx.Rollback()

	var createdDives []models.Dive
	var skippedDives []map[string]interface{}
	now := time.Now()

	for _, dive := range dives {
		// Serialize samples and equipment
		samplesJSON, err := utils.MarshalJSON(dive.Samples)
		if err != nil {
			log.Printf("Error marshaling samples in batch: %v", err)
			return nil, nil, utils.ErrProcessingFailed
		}

		equipmentJSON, err := utils.MarshalJSON(dive.Equipment)
		if err != nil {
			log.Printf("Error marshaling equipment in batch: %v", err)
			return nil, nil, utils.ErrProcessingFailed
		}

		query := `
			INSERT INTO dives (user_id, dive_site_id, dive_datetime, max_depth, duration, buddy, latitude, longitude, location, water_temperature, visibility, notes, samples, equipment, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
			RETURNING id, created_at, updated_at
		`

		var samplesParam interface{} = nil
		if len(samplesJSON) > 0 {
			samplesParam = samplesJSON
		}

		var equipmentParam interface{} = nil
		if len(equipmentJSON) > 0 {
			equipmentParam = equipmentJSON
		}

		err = tx.QueryRow(
			query,
			dive.UserID, dive.DiveSiteID, dive.DateTime, dive.MaxDepth, dive.Duration,
			dive.Buddy, dive.Latitude, dive.Longitude, dive.Location,
			dive.WaterTemp, dive.Visibility, dive.Notes, samplesParam, equipmentParam,
			now, now,
		).Scan(&dive.ID, &dive.CreatedAt, &dive.UpdatedAt)

		if err != nil {
			log.Printf("Error creating dive in batch: %v", err)
			return nil, nil, utils.ErrDatabaseError
		}

		createdDives = append(createdDives, *dive)
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Error committing dive batch: %v", err)
		return nil, nil, utils.ErrDatabaseError
	}

	return createdDives, skippedDives, nil
}

// UpdateDive updates an existing dive
func (r *DiveRepository) UpdateDive(diveID, userID int, dive *models.Dive) error {
	// Serialize samples and equipment
	samplesJSON, err := utils.MarshalJSON(dive.Samples)
	if err != nil {
		return utils.ErrProcessingFailed
	}

	equipmentJSON, err := utils.MarshalJSON(dive.Equipment)
	if err != nil {
		return utils.ErrProcessingFailed
	}

	query := `
		UPDATE dives 
		SET dive_site_id = $1, dive_datetime = $2, max_depth = $3, duration = $4, buddy = $5, 
		    latitude = $6, longitude = $7, location = $8, water_temperature = $9, visibility = $10, notes = $11, samples = $12, equipment = $13, updated_at = $14
		WHERE id = $15 AND user_id = $16
		RETURNING id, user_id, dive_datetime, max_depth, duration, buddy, 
		          water_temperature, visibility, notes, samples, equipment, created_at, updated_at
	`

	var samplesJSONOut []byte
	var equipmentJSONOut []byte
	now := time.Now()

	var samplesParam interface{} = nil
	if len(samplesJSON) > 0 {
		samplesParam = samplesJSON
	}

	var equipmentParam interface{} = nil
	if len(equipmentJSON) > 0 {
		equipmentParam = equipmentJSON
	}

	err = r.db.QueryRow(
		query,
		dive.DiveSiteID, dive.DateTime, dive.MaxDepth, dive.Duration, dive.Buddy,
		dive.Latitude, dive.Longitude, dive.Location, dive.WaterTemp, dive.Visibility, dive.Notes, samplesParam, equipmentParam, now,
		diveID, userID,
	).Scan(
		&dive.ID, &dive.UserID, &dive.DateTime, &dive.MaxDepth, &dive.Duration,
		&dive.Buddy, &dive.WaterTemp, &dive.Visibility, &dive.Notes, &samplesJSONOut, &equipmentJSONOut,
		&dive.CreatedAt, &dive.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return utils.ErrDiveNotFound
		}
		log.Printf("Error updating dive: %v", err)
		return utils.ErrDatabaseError
	}

	// Parse samples and equipment JSON
	if samplesJSONOut != nil {
		utils.UnmarshalJSON(samplesJSONOut, &dive.Samples)
	}
	if equipmentJSONOut != nil {
		utils.UnmarshalJSON(equipmentJSONOut, &dive.Equipment)
	}

	return nil
}

// DeleteDive deletes a dive
func (r *DiveRepository) DeleteDive(diveID, userID int) error {
	query := `DELETE FROM dives WHERE id = $1 AND user_id = $2`
	result, err := r.db.Exec(query, diveID, userID)
	if err != nil {
		log.Printf("Error deleting dive: %v", err)
		return utils.ErrDatabaseError
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		return utils.ErrDatabaseError
	}

	if rowsAffected == 0 {
		return utils.ErrDiveNotFound
	}

	return nil
}

// GetCurrentDive gets current dive info for comparison
func (r *DiveRepository) GetCurrentDive(diveID, userID int) (*models.Dive, error) {
	query := `SELECT dive_datetime, latitude, longitude, location FROM dives WHERE id = $1 AND user_id = $2`

	var dive models.Dive
	err := r.db.QueryRow(query, diveID, userID).Scan(
		&dive.DateTime, &dive.Latitude, &dive.Longitude, &dive.Location,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.ErrDiveNotFound
		}
		return nil, utils.ErrDatabaseError
	}

	return &dive, nil
}

// CheckDuplicateDive checks if a dive already exists for the same user, date, and dive site
func (r *DiveRepository) CheckDuplicateDive(userID int, diveSiteID int, diveDateTime string) (bool, error) {
	// Parse the datetime and extract just the date part for comparison
	dt := utils.ParseDateTime(diveDateTime)
	dateOnly := dt.Format("2006-01-02")

	query := `SELECT COUNT(*) FROM dives 
			  WHERE user_id = $1 AND dive_site_id = $2 AND DATE(dive_datetime) = $3`

	var count int
	err := r.db.QueryRow(query, userID, diveSiteID, dateOnly).Scan(&count)
	if err != nil {
		return false, utils.ErrDatabaseError
	}

	return count > 0, nil
}

// CheckDuplicateDiveForUpdateByLocation checks if a dive already exists at the same location and date, excluding the current dive
func (r *DiveRepository) CheckDuplicateDiveForUpdateByLocation(userID int, latitude, longitude float64, diveDateTime string, excludeDiveID int) (bool, error) {
	dt := utils.ParseDateTime(diveDateTime)
	dateOnly := dt.Format("2006-01-02")

	query := `
		SELECT COUNT(*) FROM dives d
		LEFT JOIN dive_sites ds ON d.dive_site_id = ds.id
		WHERE d.user_id = $1 
		  AND d.id != $2
		  AND DATE(d.dive_datetime) = $3
		  AND (
		    -- Check direct coordinates
		    (ABS(COALESCE(d.latitude, 0) - $4) < 0.001 AND ABS(COALESCE(d.longitude, 0) - $5) < 0.001)
		    OR
		    -- Check dive site coordinates  
		    (ABS(COALESCE(ds.latitude, 0) - $4) < 0.001 AND ABS(COALESCE(ds.longitude, 0) - $5) < 0.001)
		  )`

	var count int
	err := r.db.QueryRow(query, userID, excludeDiveID, dateOnly, latitude, longitude).Scan(&count)
	if err != nil {
		return false, utils.ErrDatabaseError
	}

	return count > 0, nil
}

// scanDive scans a dive from database rows
func (r *DiveRepository) scanDive(rows *sql.Rows) (*models.Dive, error) {
	var dive models.Dive
	var samplesJSON []byte
	var equipmentJSON []byte

	err := rows.Scan(
		&dive.ID, &dive.UserID, &dive.DiveSiteID, &dive.DateTime, &dive.MaxDepth,
		&dive.Duration, &dive.Buddy, &dive.WaterTemp, &dive.Visibility,
		&dive.Notes, &samplesJSON, &equipmentJSON, &dive.CreatedAt, &dive.UpdatedAt,
		&dive.Latitude, &dive.Longitude, &dive.Location,
	)
	if err != nil {
		return nil, err
	}

	// Parse samples and equipment JSON
	if samplesJSON != nil {
		utils.UnmarshalJSON(samplesJSON, &dive.Samples)
	}
	if equipmentJSON != nil {
		utils.UnmarshalJSON(equipmentJSON, &dive.Equipment)
	}

	return &dive, nil
}
