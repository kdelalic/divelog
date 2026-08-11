package repository

import (
	"context"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
	"strings"
	"time"

	"github.com/lib/pq"
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
			d.id, d.user_id, d.dive_site_id, d.dive_number, d.trip_id, d.dive_datetime, d.max_depth, d.duration,
			d.buddy, d.water_temperature, d.visibility, d.notes, d.samples, d.equipment,
			d.conditions, d.dive_type, d.rating, d.safety_stops, d.created_at, d.updated_at,
			COALESCE(ds.latitude, d.latitude, 0.0) as latitude,
			COALESCE(ds.longitude, d.longitude, 0.0) as longitude,
			COALESCE(ds.name, d.location, 'Unknown Location') as location,
			tr.name, tr.location, tr.start_date::text, tr.end_date::text, tr.notes,
			ARRAY(SELECT t.name FROM dive_tags dt JOIN tags t ON t.id = dt.tag_id
			      WHERE dt.dive_id = d.id ORDER BY lower(t.name)) AS tags
		FROM dives d
		LEFT JOIN dive_sites ds ON d.dive_site_id = ds.id
		LEFT JOIN trips tr ON d.trip_id = tr.id
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
	if err := r.prepareDiveOrganization(dive); err != nil {
		return err
	}
	samplesParam, equipmentParam, conditionsParam, safetyStopsParam, err := marshalDiveJSON(dive)
	if err != nil {
		utils.LogError(ctx, "Error marshaling dive JSON fields", err, utils.UserID(dive.UserID))
		return utils.ErrProcessingFailed
	}

	query := `
		INSERT INTO dives (user_id, dive_site_id, dive_number, trip_id, dive_datetime, max_depth, duration, buddy, latitude, longitude, location, water_temperature, visibility, notes, samples, equipment, conditions, dive_type, rating, safety_stops, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	err = r.db.QueryRow(
		query,
		dive.UserID, dive.DiveSiteID, dive.DiveNumber, dive.TripID, dive.DateTime, dive.MaxDepth, dive.Duration,
		dive.Buddy, dive.Latitude, dive.Longitude, dive.Location,
		dive.WaterTemp, dive.Visibility, dive.Notes, samplesParam, equipmentParam,
		conditionsParam, dive.DiveType, dive.Rating, safetyStopsParam,
		now, now,
	).Scan(&dive.ID, &dive.CreatedAt, &dive.UpdatedAt)

	if err != nil {
		utils.LogError(ctx, "Error creating dive", err, utils.UserID(dive.UserID))
		return utils.ErrDatabaseError
	}
	if err := r.replaceDiveTags(dive.ID, dive.UserID, dive.Tags); err != nil {
		return err
	}

	return nil
}

// UpdateDive updates an existing dive
func (r *DiveRepository) UpdateDive(ctx context.Context, diveID, userID int, dive *models.Dive) error {
	dive.ID = diveID
	if err := r.prepareDiveOrganization(dive); err != nil {
		return err
	}
	samplesParam, equipmentParam, conditionsParam, safetyStopsParam, err := marshalDiveJSON(dive)
	if err != nil {
		return utils.ErrProcessingFailed
	}

	query := `
		UPDATE dives
		SET dive_site_id = $1, dive_number = $2, trip_id = $3, dive_datetime = $4, max_depth = $5, duration = $6, buddy = $7,
		    latitude = $8, longitude = $9, location = $10, water_temperature = $11, visibility = $12, notes = $13, samples = $14, equipment = $15,
		    conditions = $16, dive_type = $17, rating = $18, safety_stops = $19, updated_at = $20
		WHERE id = $21 AND user_id = $22
		RETURNING id, user_id, created_at, updated_at
	`
	now := time.Now()

	err = r.db.QueryRow(
		query,
		dive.DiveSiteID, dive.DiveNumber, dive.TripID, dive.DateTime, dive.MaxDepth, dive.Duration, dive.Buddy,
		dive.Latitude, dive.Longitude, dive.Location, dive.WaterTemp, dive.Visibility, dive.Notes, samplesParam, equipmentParam,
		conditionsParam, dive.DiveType, dive.Rating, safetyStopsParam, now,
		diveID, userID,
	).Scan(
		&dive.ID, &dive.UserID, &dive.CreatedAt, &dive.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return utils.ErrDiveNotFound
		}
		utils.LogError(ctx, "Error updating dive", err, utils.UserID(userID), utils.DiveID(diveID))
		return utils.ErrDatabaseError
	}

	if err := r.replaceDiveTags(diveID, userID, dive.Tags); err != nil {
		return err
	}

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
	var tripName, tripLocation, tripStart, tripEnd, tripNotes sql.NullString
	var tags []string

	err := rows.Scan(
		&dive.ID, &dive.UserID, &dive.DiveSiteID, &dive.DiveNumber, &dive.TripID, &dive.DateTime, &dive.MaxDepth,
		&dive.Duration, &dive.Buddy, &dive.WaterTemp, &dive.Visibility,
		&dive.Notes, &samplesJSON, &equipmentJSON,
		&conditionsJSON, &dive.DiveType, &dive.Rating, &safetyStopsJSON,
		&dive.CreatedAt, &dive.UpdatedAt,
		&dive.Latitude, &dive.Longitude, &dive.Location,
		&tripName, &tripLocation, &tripStart, &tripEnd, &tripNotes, pq.Array(&tags),
	)
	if err != nil {
		return nil, err
	}

	// Parse the JSONB-backed fields
	utils.UnmarshalJSON(samplesJSON, &dive.Samples)
	utils.UnmarshalJSON(equipmentJSON, &dive.Equipment)
	utils.UnmarshalJSON(conditionsJSON, &dive.Conditions)
	utils.UnmarshalJSON(safetyStopsJSON, &dive.SafetyStops)
	dive.Tags = tags
	if dive.TripID != nil && tripName.Valid {
		dive.Trip = &models.Trip{ID: *dive.TripID, UserID: dive.UserID, Name: tripName.String}
		dive.Trip.Location = nullStringPointer(tripLocation)
		dive.Trip.StartDate = nullStringPointer(tripStart)
		dive.Trip.EndDate = nullStringPointer(tripEnd)
		dive.Trip.Notes = nullStringPointer(tripNotes)
	}

	return &dive, nil
}

func nullStringPointer(value sql.NullString) *string {
	if !value.Valid || value.String == "" {
		return nil
	}
	result := value.String
	return &result
}

func optionalText(value *string) interface{} {
	if value == nil || strings.TrimSpace(*value) == "" {
		return nil
	}
	return strings.TrimSpace(*value)
}

// prepareDiveOrganization assigns the next human-visible number and resolves
// either a selected trip ID or imported trip metadata within the current
// transaction-bound repository.
func (r *DiveRepository) prepareDiveOrganization(dive *models.Dive) error {
	if dive.DiveNumber == nil {
		var next int
		if err := r.db.QueryRow(`SELECT COALESCE(MAX(dive_number), 0) + 1 FROM dives WHERE user_id = $1`, dive.UserID).Scan(&next); err != nil {
			return utils.ErrDatabaseError
		}
		dive.DiveNumber = &next
	}

	if dive.Trip != nil && strings.TrimSpace(dive.Trip.Name) != "" {
		var id int
		err := r.db.QueryRow(`
			INSERT INTO trips (user_id, name, location, start_date, end_date, notes)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (user_id, lower(name)) DO UPDATE SET
				location = COALESCE(EXCLUDED.location, trips.location),
				start_date = COALESCE(EXCLUDED.start_date, trips.start_date),
				end_date = COALESCE(EXCLUDED.end_date, trips.end_date),
				notes = COALESCE(EXCLUDED.notes, trips.notes), updated_at = NOW()
			RETURNING id`,
			dive.UserID, strings.TrimSpace(dive.Trip.Name), optionalText(dive.Trip.Location),
			optionalText(dive.Trip.StartDate), optionalText(dive.Trip.EndDate), optionalText(dive.Trip.Notes),
		).Scan(&id)
		if err != nil {
			return utils.ErrDatabaseError
		}
		dive.TripID = &id
		dive.Trip.ID = id
		dive.Trip.UserID = dive.UserID
	} else if dive.TripID != nil {
		var name string
		if err := r.db.QueryRow(`SELECT name FROM trips WHERE id = $1 AND user_id = $2`, *dive.TripID, dive.UserID).Scan(&name); err != nil {
			if err == sql.ErrNoRows {
				return utils.ErrTripNotFound
			}
			return utils.ErrDatabaseError
		}
		dive.Trip = &models.Trip{ID: *dive.TripID, UserID: dive.UserID, Name: name}
	}
	return nil
}

func (r *DiveRepository) replaceDiveTags(diveID, userID int, tagNames []string) error {
	if _, err := r.db.Exec(`DELETE FROM dive_tags WHERE dive_id = $1`, diveID); err != nil {
		return utils.ErrDatabaseError
	}
	seen := map[string]bool{}
	for _, raw := range tagNames {
		name := strings.TrimSpace(raw)
		key := strings.ToLower(name)
		if name == "" || seen[key] {
			continue
		}
		seen[key] = true
		var tagID int
		err := r.db.QueryRow(`
			INSERT INTO tags (user_id, name) VALUES ($1, $2)
			ON CONFLICT (user_id, lower(name)) DO UPDATE SET name = tags.name
			RETURNING id`, userID, name).Scan(&tagID)
		if err != nil {
			return utils.ErrDatabaseError
		}
		if _, err := r.db.Exec(`INSERT INTO dive_tags (dive_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, diveID, tagID); err != nil {
			return utils.ErrDatabaseError
		}
	}
	return nil
}
