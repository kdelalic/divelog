package repository

import (
	"context"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
	"time"
)

type DiveRepository struct {
	db dbExecutor
}

func NewDiveRepository(db *sql.DB) *DiveRepository {
	return &DiveRepository{db: db}
}

func newDiveRepository(db dbExecutor) *DiveRepository {
	return &DiveRepository{db: db}
}

// jsonbParam returns a value for a JSONB column, storing NULL for empty payloads.
func jsonbParam(payload []byte) interface{} {
	if len(payload) == 0 {
		return nil
	}
	return payload
}

// marshalDiveJSON serializes the JSONB-backed fields of a dive.
func marshalDiveJSON(dive *models.Dive) (samples, equipment, conditions, safetyStops interface{}, err error) {
	samplesJSON, err := utils.MarshalJSON(dive.Samples)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	equipmentJSON, err := utils.MarshalJSON(dive.Equipment)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	conditionsJSON, err := utils.MarshalJSON(dive.Conditions)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	safetyStopsJSON, err := utils.MarshalJSON(dive.SafetyStops)
	if err != nil {
		return nil, nil, nil, nil, err
	}
	return jsonbParam(samplesJSON), jsonbParam(equipmentJSON),
		jsonbParam(conditionsJSON), jsonbParam(safetyStopsJSON), nil
}

// GetDivesByUserID retrieves all dives for a user
func (r *DiveRepository) GetDivesByUserID(ctx context.Context, userID int) ([]models.Dive, error) {
	query := `
		SELECT 
			d.id, d.user_id, d.dive_site_id, d.dive_datetime, d.max_depth, d.duration, 
			d.buddy, d.water_temperature, d.visibility, d.notes, d.samples, d.equipment,
			d.conditions, d.dive_type, d.rating, d.safety_stops, d.created_at, d.updated_at,
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
		utils.LogError(ctx, "Error querying dives", err, utils.UserID(userID))
		return nil, utils.ErrDatabaseError
	}
	defer rows.Close()

	var dives []models.Dive
	for rows.Next() {
		dive, err := r.scanDive(rows)
		if err != nil {
			utils.LogError(ctx, "Error scanning dive", err, utils.UserID(userID))
			continue
		}
		dives = append(dives, *dive)
	}

	if err = rows.Err(); err != nil {
		utils.LogError(ctx, "Error iterating over dives", err, utils.UserID(userID))
		return nil, utils.ErrDatabaseError
	}

	return dives, nil
}

// CreateDive creates a new dive
func (r *DiveRepository) CreateDive(ctx context.Context, dive *models.Dive) error {
	samplesParam, equipmentParam, conditionsParam, safetyStopsParam, err := marshalDiveJSON(dive)
	if err != nil {
		utils.LogError(ctx, "Error marshaling dive JSON fields", err, utils.UserID(dive.UserID))
		return utils.ErrProcessingFailed
	}

	query := `
		INSERT INTO dives (user_id, dive_site_id, dive_datetime, max_depth, duration, buddy, latitude, longitude, location, water_temperature, visibility, notes, samples, equipment, conditions, dive_type, rating, safety_stops, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	err = r.db.QueryRow(
		query,
		dive.UserID, dive.DiveSiteID, dive.DateTime, dive.MaxDepth, dive.Duration,
		dive.Buddy, dive.Latitude, dive.Longitude, dive.Location,
		dive.WaterTemp, dive.Visibility, dive.Notes, samplesParam, equipmentParam,
		conditionsParam, dive.DiveType, dive.Rating, safetyStopsParam,
		now, now,
	).Scan(&dive.ID, &dive.CreatedAt, &dive.UpdatedAt)

	if err != nil {
		utils.LogError(ctx, "Error creating dive", err, utils.UserID(dive.UserID))
		return utils.ErrDatabaseError
	}

	return nil
}

// UpdateDive updates an existing dive
func (r *DiveRepository) UpdateDive(ctx context.Context, diveID, userID int, dive *models.Dive) error {
	samplesParam, equipmentParam, conditionsParam, safetyStopsParam, err := marshalDiveJSON(dive)
	if err != nil {
		return utils.ErrProcessingFailed
	}

	query := `
		UPDATE dives
		SET dive_site_id = $1, dive_datetime = $2, max_depth = $3, duration = $4, buddy = $5,
		    latitude = $6, longitude = $7, location = $8, water_temperature = $9, visibility = $10, notes = $11, samples = $12, equipment = $13,
		    conditions = $14, dive_type = $15, rating = $16, safety_stops = $17, updated_at = $18
		WHERE id = $19 AND user_id = $20
		RETURNING id, user_id, dive_datetime, max_depth, duration, buddy,
		          water_temperature, visibility, notes, samples, equipment,
		          conditions, dive_type, rating, safety_stops, created_at, updated_at
	`

	var samplesJSONOut []byte
	var equipmentJSONOut []byte
	var conditionsJSONOut []byte
	var safetyStopsJSONOut []byte
	now := time.Now()

	err = r.db.QueryRow(
		query,
		dive.DiveSiteID, dive.DateTime, dive.MaxDepth, dive.Duration, dive.Buddy,
		dive.Latitude, dive.Longitude, dive.Location, dive.WaterTemp, dive.Visibility, dive.Notes, samplesParam, equipmentParam,
		conditionsParam, dive.DiveType, dive.Rating, safetyStopsParam, now,
		diveID, userID,
	).Scan(
		&dive.ID, &dive.UserID, &dive.DateTime, &dive.MaxDepth, &dive.Duration,
		&dive.Buddy, &dive.WaterTemp, &dive.Visibility, &dive.Notes, &samplesJSONOut, &equipmentJSONOut,
		&conditionsJSONOut, &dive.DiveType, &dive.Rating, &safetyStopsJSONOut,
		&dive.CreatedAt, &dive.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return utils.ErrDiveNotFound
		}
		utils.LogError(ctx, "Error updating dive", err, utils.UserID(userID), utils.DiveID(diveID))
		return utils.ErrDatabaseError
	}

	// Parse the JSONB-backed fields
	utils.UnmarshalJSON(samplesJSONOut, &dive.Samples)
	utils.UnmarshalJSON(equipmentJSONOut, &dive.Equipment)
	utils.UnmarshalJSON(conditionsJSONOut, &dive.Conditions)
	utils.UnmarshalJSON(safetyStopsJSONOut, &dive.SafetyStops)

	return nil
}

// DeleteAllDives removes every dive belonging to a user and reports how many
// rows were removed. Intended for resetting local test data.
func (r *DiveRepository) DeleteAllDives(ctx context.Context, userID int) (int64, error) {
	result, err := r.db.ExecContext(ctx, `DELETE FROM dives WHERE user_id = $1`, userID)
	if err != nil {
		utils.LogError(ctx, "Error deleting all dives", err, utils.UserID(userID))
		return 0, utils.ErrDatabaseError
	}

	deleted, err := result.RowsAffected()
	if err != nil {
		utils.LogError(ctx, "Error getting rows affected", err, utils.UserID(userID))
		return 0, utils.ErrDatabaseError
	}

	return deleted, nil
}

// DeleteDive deletes a dive
func (r *DiveRepository) DeleteDive(ctx context.Context, diveID, userID int) error {
	query := `DELETE FROM dives WHERE id = $1 AND user_id = $2`
	result, err := r.db.Exec(query, diveID, userID)
	if err != nil {
		utils.LogError(ctx, "Error deleting dive", err, utils.UserID(userID), utils.DiveID(diveID))
		return utils.ErrDatabaseError
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		utils.LogError(ctx, "Error getting rows affected", err, utils.UserID(userID), utils.DiveID(diveID))
		return utils.ErrDatabaseError
	}

	if rowsAffected == 0 {
		return utils.ErrDiveNotFound
	}

	return nil
}

// GetCurrentDive gets current dive info for comparison
func (r *DiveRepository) GetCurrentDive(ctx context.Context, diveID, userID int) (*models.Dive, error) {
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

// CheckDuplicateDive checks if a dive already exists for the same user, start
// time, and dive site. Matching on the full timestamp rather than the date
// keeps repeat dives at one site on the same day as distinct dives.
func (r *DiveRepository) CheckDuplicateDive(ctx context.Context, userID int, diveSiteID int, diveDateTime string) (bool, error) {
	dt := utils.ParseDateTime(diveDateTime)

	query := `SELECT COUNT(*) FROM dives
			  WHERE user_id = $1 AND dive_site_id = $2 AND dive_datetime = $3`

	var count int
	err := r.db.QueryRow(query, userID, diveSiteID, dt).Scan(&count)
	if err != nil {
		return false, utils.ErrDatabaseError
	}

	return count > 0, nil
}

// CheckDuplicateDiveForUpdate checks the same identity used for creates while
// excluding the dive currently being updated.
func (r *DiveRepository) CheckDuplicateDiveForUpdate(ctx context.Context, userID, diveSiteID int, diveDateTime string, excludeDiveID int) (bool, error) {
	dt := utils.ParseDateTime(diveDateTime)
	query := `SELECT COUNT(*) FROM dives
		WHERE user_id = $1 AND dive_site_id = $2 AND dive_datetime = $3 AND id != $4`

	var count int
	err := r.db.QueryRow(query, userID, diveSiteID, dt, excludeDiveID).Scan(&count)
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
	var conditionsJSON []byte
	var safetyStopsJSON []byte

	err := rows.Scan(
		&dive.ID, &dive.UserID, &dive.DiveSiteID, &dive.DateTime, &dive.MaxDepth,
		&dive.Duration, &dive.Buddy, &dive.WaterTemp, &dive.Visibility,
		&dive.Notes, &samplesJSON, &equipmentJSON,
		&conditionsJSON, &dive.DiveType, &dive.Rating, &safetyStopsJSON,
		&dive.CreatedAt, &dive.UpdatedAt,
		&dive.Latitude, &dive.Longitude, &dive.Location,
	)
	if err != nil {
		return nil, err
	}

	// Parse the JSONB-backed fields
	utils.UnmarshalJSON(samplesJSON, &dive.Samples)
	utils.UnmarshalJSON(equipmentJSON, &dive.Equipment)
	utils.UnmarshalJSON(conditionsJSON, &dive.Conditions)
	utils.UnmarshalJSON(safetyStopsJSON, &dive.SafetyStops)

	return &dive, nil
}
