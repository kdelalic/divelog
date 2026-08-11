package repository

import (
	"context"
	"crypto/rand"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/lib/pq"
)

// LogbookRepository owns reusable tags, trips, and numbering operations.
type LogbookRepository struct {
	db *sql.DB
}

type timestampState struct {
	ID       int              `json:"id"`
	DateTime models.LocalTime `json:"datetime"`
}

func newOperationID() (string, error) {
	value := make([]byte, 16)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return hex.EncodeToString(value), nil
}

func hasTimestampConflict(ctx context.Context, tx *sql.Tx, userID int, diveIDs []int, offsetMinutes int) (bool, error) {
	var conflict bool
	err := tx.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM dives selected
			JOIN dives existing ON existing.user_id = selected.user_id
			 AND existing.dive_site_id IS NOT DISTINCT FROM selected.dive_site_id
			 AND existing.dive_datetime = selected.dive_datetime + ($3 * INTERVAL '1 minute')
			WHERE selected.user_id = $1 AND selected.id = ANY($2) AND NOT (existing.id = ANY($2))
		)`, userID, pq.Array(diveIDs), offsetMinutes).Scan(&conflict)
	if err != nil {
		return false, utils.ErrDatabaseError
	}
	return conflict, nil
}

func (r *LogbookRepository) ShiftDiveTimes(ctx context.Context, userID int, request models.ShiftDiveTimesRequest) (*models.BulkOperation, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	defer tx.Rollback()
	if err := ensureOwnedDives(ctx, tx, userID, request.DiveIDs); err != nil {
		return nil, err
	}
	conflict, err := hasTimestampConflict(ctx, tx, userID, request.DiveIDs, request.OffsetMinutes)
	if err != nil {
		return nil, err
	}
	if conflict {
		return nil, utils.ErrTimestampConflict
	}

	rows, err := tx.QueryContext(ctx, `SELECT id, dive_datetime FROM dives WHERE user_id = $1 AND id = ANY($2) ORDER BY id`, userID, pq.Array(request.DiveIDs))
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	states := make([]timestampState, 0, len(request.DiveIDs))
	for rows.Next() {
		var state timestampState
		if err := rows.Scan(&state.ID, &state.DateTime); err != nil {
			rows.Close()
			return nil, utils.ErrDatabaseError
		}
		states = append(states, state)
	}
	if err := rows.Close(); err != nil {
		return nil, utils.ErrDatabaseError
	}
	beforeState, err := json.Marshal(states)
	if err != nil {
		return nil, utils.ErrProcessingFailed
	}
	operationID, err := newOperationID()
	if err != nil {
		return nil, utils.ErrProcessingFailed
	}
	operation := &models.BulkOperation{ID: operationID, OperationType: "timestamp_shift", AffectedCount: len(states), CreatedAt: time.Now()}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO bulk_operations (id, user_id, operation_type, before_state, affected_count, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)`, operation.ID, userID, operation.OperationType, beforeState, operation.AffectedCount, operation.CreatedAt); err != nil {
		return nil, utils.ErrDatabaseError
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE dives SET dive_datetime = dive_datetime + ($1 * INTERVAL '1 minute'), updated_at = NOW()
		WHERE user_id = $2 AND id = ANY($3)`, request.OffsetMinutes, userID, pq.Array(request.DiveIDs)); err != nil {
		return nil, utils.ErrDatabaseError
	}
	if err := tx.Commit(); err != nil {
		return nil, utils.ErrDatabaseError
	}
	return operation, nil
}

func (r *LogbookRepository) LatestUndoableOperation(ctx context.Context, userID int) (*models.BulkOperation, error) {
	operation := &models.BulkOperation{}
	err := r.db.QueryRowContext(ctx, `
		SELECT id, operation_type, affected_count, created_at, undone_at
		FROM bulk_operations WHERE user_id = $1 AND operation_type = 'timestamp_shift' AND undone_at IS NULL
		ORDER BY created_at DESC LIMIT 1`, userID).Scan(
		&operation.ID, &operation.OperationType, &operation.AffectedCount, &operation.CreatedAt, &operation.UndoneAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	return operation, nil
}

func (r *LogbookRepository) UndoBulkOperation(ctx context.Context, userID int, operationID string) (*models.BulkOperation, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	defer tx.Rollback()
	operation := &models.BulkOperation{ID: operationID}
	var beforeState []byte
	err = tx.QueryRowContext(ctx, `
		SELECT operation_type, affected_count, created_at, undone_at, before_state
		FROM bulk_operations WHERE id = $1 AND user_id = $2 FOR UPDATE`, operationID, userID).Scan(
		&operation.OperationType, &operation.AffectedCount, &operation.CreatedAt, &operation.UndoneAt, &beforeState,
	)
	if err == sql.ErrNoRows {
		return nil, utils.ErrBulkOperationNotFound
	}
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	if operation.UndoneAt != nil {
		return nil, utils.ErrBulkOperationUndone
	}
	if operation.OperationType != "timestamp_shift" {
		return nil, utils.ErrInvalidInput
	}
	var states []timestampState
	if err := json.Unmarshal(beforeState, &states); err != nil {
		return nil, utils.ErrProcessingFailed
	}
	ids := make([]int, 0, len(states))
	for _, state := range states {
		ids = append(ids, state.ID)
	}
	if err := ensureOwnedDives(ctx, tx, userID, ids); err != nil {
		return nil, err
	}
	for _, state := range states {
		var conflict bool
		if err := tx.QueryRowContext(ctx, `
			SELECT EXISTS(SELECT 1 FROM dives target JOIN dives existing
			  ON existing.user_id = target.user_id
			 AND existing.dive_site_id IS NOT DISTINCT FROM target.dive_site_id
			 AND existing.dive_datetime = $1
			 WHERE target.id = $2 AND target.user_id = $3 AND NOT (existing.id = ANY($4)))`,
			state.DateTime, state.ID, userID, pq.Array(ids)).Scan(&conflict); err != nil {
			return nil, utils.ErrDatabaseError
		}
		if conflict {
			return nil, utils.ErrTimestampConflict
		}
		if _, err := tx.ExecContext(ctx, `UPDATE dives SET dive_datetime = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3`, state.DateTime, state.ID, userID); err != nil {
			return nil, utils.ErrDatabaseError
		}
	}
	now := time.Now()
	if _, err := tx.ExecContext(ctx, `UPDATE bulk_operations SET undone_at = $1 WHERE id = $2 AND user_id = $3`, now, operationID, userID); err != nil {
		return nil, utils.ErrDatabaseError
	}
	operation.UndoneAt = &now
	if err := tx.Commit(); err != nil {
		return nil, utils.ErrDatabaseError
	}
	return operation, nil
}

func ensureOwnedDives(ctx context.Context, tx *sql.Tx, userID int, diveIDs []int) error {
	var count int
	if err := tx.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM dives WHERE user_id = $1 AND id = ANY($2)`,
		userID, pq.Array(diveIDs),
	).Scan(&count); err != nil {
		return utils.ErrDatabaseError
	}
	if count != len(diveIDs) {
		return utils.ErrDiveNotFound
	}
	return nil
}

// BulkUpdateDives applies one partial update to every selected dive in a
// serializable transaction. Ownership is checked before any mutation.
func (r *LogbookRepository) BulkUpdateDives(ctx context.Context, userID int, request models.BulkDiveUpdateRequest) (int64, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return 0, utils.ErrDatabaseError
	}
	defer tx.Rollback()
	if err := ensureOwnedDives(ctx, tx, userID, request.DiveIDs); err != nil {
		return 0, err
	}
	if request.TripID != nil {
		var exists bool
		if err := tx.QueryRowContext(ctx,
			`SELECT EXISTS(SELECT 1 FROM trips WHERE id = $1 AND user_id = $2)`,
			*request.TripID, userID,
		).Scan(&exists); err != nil {
			return 0, utils.ErrDatabaseError
		}
		if !exists {
			return 0, utils.ErrTripNotFound
		}
	}

	sets := []string{}
	args := []interface{}{}
	addSet := func(column string, value interface{}) {
		args = append(args, value)
		sets = append(sets, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if request.TripID != nil {
		addSet("trip_id", *request.TripID)
	} else if request.ClearTrip {
		sets = append(sets, "trip_id = NULL")
	}
	if request.Buddy != nil {
		addSet("buddy", strings.TrimSpace(*request.Buddy))
	} else if request.ClearBuddy {
		sets = append(sets, "buddy = NULL")
	}
	if request.DiveType != nil {
		addSet("dive_type", *request.DiveType)
	} else if request.ClearDiveType {
		sets = append(sets, "dive_type = NULL")
	}
	if request.Rating != nil {
		addSet("rating", *request.Rating)
	} else if request.ClearRating {
		sets = append(sets, "rating = NULL")
	}

	if len(sets) > 0 {
		sets = append(sets, "updated_at = NOW()")
		args = append(args, userID, pq.Array(request.DiveIDs))
		query := fmt.Sprintf(`UPDATE dives SET %s WHERE user_id = $%d AND id = ANY($%d)`,
			strings.Join(sets, ", "), len(args)-1, len(args))
		if _, err := tx.ExecContext(ctx, query, args...); err != nil {
			return 0, utils.ErrDatabaseError
		}
	}

	for _, rawName := range request.AddTags {
		name := strings.TrimSpace(rawName)
		var tagID int
		if err := tx.QueryRowContext(ctx, `
			INSERT INTO tags (user_id, name) VALUES ($1, $2)
			ON CONFLICT (user_id, lower(name)) DO UPDATE SET name = tags.name
			RETURNING id`, userID, name).Scan(&tagID); err != nil {
			return 0, utils.ErrDatabaseError
		}
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO dive_tags (dive_id, tag_id)
			SELECT id, $1 FROM dives WHERE user_id = $2 AND id = ANY($3)
			ON CONFLICT DO NOTHING`, tagID, userID, pq.Array(request.DiveIDs)); err != nil {
			return 0, utils.ErrDatabaseError
		}
	}
	if len(request.RemoveTags) > 0 {
		trimmed := make([]string, 0, len(request.RemoveTags))
		for _, name := range request.RemoveTags {
			trimmed = append(trimmed, strings.TrimSpace(name))
		}
		if _, err := tx.ExecContext(ctx, `
			DELETE FROM dive_tags dt USING tags t, dives d
			WHERE dt.tag_id = t.id AND dt.dive_id = d.id
			  AND t.user_id = $1 AND d.user_id = $1 AND d.id = ANY($2)
			  AND lower(t.name) = ANY(SELECT lower(value) FROM unnest($3::text[]) AS value)`,
			userID, pq.Array(request.DiveIDs), pq.Array(trimmed)); err != nil {
			return 0, utils.ErrDatabaseError
		}
	}
	if err := tx.Commit(); err != nil {
		return 0, utils.ErrDatabaseError
	}
	return int64(len(request.DiveIDs)), nil
}

func (r *LogbookRepository) BulkDeleteDives(ctx context.Context, userID int, diveIDs []int) (int64, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return 0, utils.ErrDatabaseError
	}
	defer tx.Rollback()
	if err := ensureOwnedDives(ctx, tx, userID, diveIDs); err != nil {
		return 0, err
	}
	result, err := tx.ExecContext(ctx, `DELETE FROM dives WHERE user_id = $1 AND id = ANY($2)`, userID, pq.Array(diveIDs))
	if err != nil {
		return 0, utils.ErrDatabaseError
	}
	deleted, err := result.RowsAffected()
	if err != nil {
		return 0, utils.ErrDatabaseError
	}
	if err := tx.Commit(); err != nil {
		return 0, utils.ErrDatabaseError
	}
	return deleted, nil
}

func NewLogbookRepository(db *sql.DB) *LogbookRepository {
	return &LogbookRepository{db: db}
}

func (r *LogbookRepository) GetTags(ctx context.Context, userID int) ([]models.TagSummary, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT t.id, t.name, COUNT(dt.dive_id)::int
		FROM tags t LEFT JOIN dive_tags dt ON dt.tag_id = t.id
		WHERE t.user_id = $1 GROUP BY t.id, t.name ORDER BY lower(t.name)`, userID)
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	defer rows.Close()
	tags := []models.TagSummary{}
	for rows.Next() {
		var tag models.TagSummary
		if err := rows.Scan(&tag.ID, &tag.Name, &tag.DiveCount); err != nil {
			return nil, utils.ErrDatabaseError
		}
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

func (r *LogbookRepository) CreateTag(ctx context.Context, userID int, name string) (*models.TagSummary, error) {
	tag := &models.TagSummary{Name: strings.TrimSpace(name)}
	err := r.db.QueryRowContext(ctx, `INSERT INTO tags (user_id, name) VALUES ($1, $2) RETURNING id`, userID, tag.Name).Scan(&tag.ID)
	if isUniqueViolation(err) {
		return nil, utils.ErrOrganizationConflict
	}
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	return tag, nil
}

func (r *LogbookRepository) UpdateTag(ctx context.Context, userID, tagID int, name string) (*models.TagSummary, error) {
	tag := &models.TagSummary{ID: tagID, Name: strings.TrimSpace(name)}
	err := r.db.QueryRowContext(ctx, `
		UPDATE tags SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3
		RETURNING (SELECT COUNT(*)::int FROM dive_tags WHERE tag_id = tags.id)`,
		tag.Name, tagID, userID).Scan(&tag.DiveCount)
	if err == sql.ErrNoRows {
		return nil, utils.ErrTagNotFound
	}
	if isUniqueViolation(err) {
		return nil, utils.ErrOrganizationConflict
	}
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	return tag, nil
}

func (r *LogbookRepository) DeleteTag(ctx context.Context, userID, tagID int) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM tags WHERE id = $1 AND user_id = $2`, tagID, userID)
	if err != nil {
		return utils.ErrDatabaseError
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		return utils.ErrTagNotFound
	}
	return nil
}

func (r *LogbookRepository) GetTrips(ctx context.Context, userID int) ([]models.Trip, error) {
	rows, err := r.db.QueryContext(ctx, `
		SELECT tr.id, tr.user_id, tr.name, tr.location, tr.start_date::text, tr.end_date::text, tr.notes,
		       COUNT(d.id)::int
		FROM trips tr LEFT JOIN dives d ON d.trip_id = tr.id
		WHERE tr.user_id = $1 GROUP BY tr.id ORDER BY tr.start_date DESC NULLS LAST, lower(tr.name)`, userID)
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	defer rows.Close()
	trips := []models.Trip{}
	for rows.Next() {
		trip, err := scanTrip(rows)
		if err != nil {
			return nil, utils.ErrDatabaseError
		}
		trips = append(trips, *trip)
	}
	return trips, rows.Err()
}

type rowScanner interface {
	Scan(...interface{}) error
}

func scanTrip(row rowScanner) (*models.Trip, error) {
	var trip models.Trip
	var location, start, end, notes sql.NullString
	if err := row.Scan(&trip.ID, &trip.UserID, &trip.Name, &location, &start, &end, &notes, &trip.DiveCount); err != nil {
		return nil, err
	}
	trip.Location = nullStringPointer(location)
	trip.StartDate = nullStringPointer(start)
	trip.EndDate = nullStringPointer(end)
	trip.Notes = nullStringPointer(notes)
	return &trip, nil
}

func (r *LogbookRepository) CreateTrip(ctx context.Context, userID int, request models.TripRequest) (*models.Trip, error) {
	trip := &models.Trip{UserID: userID, Name: strings.TrimSpace(request.Name), Location: request.Location, StartDate: request.StartDate, EndDate: request.EndDate, Notes: request.Notes}
	var location, start, end, notes sql.NullString
	err := r.db.QueryRowContext(ctx, `
		INSERT INTO trips (user_id, name, location, start_date, end_date, notes)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, name, location, start_date::text, end_date::text, notes, 0`,
		userID, trip.Name, optionalText(request.Location), optionalText(request.StartDate), optionalText(request.EndDate), optionalText(request.Notes),
	).Scan(&trip.ID, &trip.UserID, &trip.Name, &location, &start, &end, &notes, &trip.DiveCount)
	if isUniqueViolation(err) {
		return nil, utils.ErrOrganizationConflict
	}
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	trip.Location, trip.StartDate, trip.EndDate, trip.Notes = nullStringPointer(location), nullStringPointer(start), nullStringPointer(end), nullStringPointer(notes)
	return trip, nil
}

func (r *LogbookRepository) UpdateTrip(ctx context.Context, userID, tripID int, request models.TripRequest) (*models.Trip, error) {
	trip := &models.Trip{}
	var location, start, end, notes sql.NullString
	err := r.db.QueryRowContext(ctx, `
		UPDATE trips SET name = $1, location = $2, start_date = $3, end_date = $4, notes = $5, updated_at = NOW()
		WHERE id = $6 AND user_id = $7
		RETURNING id, user_id, name, location, start_date::text, end_date::text, notes,
		          (SELECT COUNT(*)::int FROM dives WHERE trip_id = trips.id)`,
		strings.TrimSpace(request.Name), optionalText(request.Location), optionalText(request.StartDate), optionalText(request.EndDate), optionalText(request.Notes), tripID, userID,
	).Scan(&trip.ID, &trip.UserID, &trip.Name, &location, &start, &end, &notes, &trip.DiveCount)
	if err == sql.ErrNoRows {
		return nil, utils.ErrTripNotFound
	}
	if isUniqueViolation(err) {
		return nil, utils.ErrOrganizationConflict
	}
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	trip.Location, trip.StartDate, trip.EndDate, trip.Notes = nullStringPointer(location), nullStringPointer(start), nullStringPointer(end), nullStringPointer(notes)
	return trip, nil
}

func (r *LogbookRepository) DeleteTrip(ctx context.Context, userID, tripID int) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM trips WHERE id = $1 AND user_id = $2`, tripID, userID)
	if err != nil {
		return utils.ErrDatabaseError
	}
	count, _ := result.RowsAffected()
	if count == 0 {
		return utils.ErrTripNotFound
	}
	return nil
}

func (r *LogbookRepository) MergeTrips(ctx context.Context, userID, targetID int, sourceIDs []int) error {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return utils.ErrDatabaseError
	}
	defer tx.Rollback()
	var targetExists bool
	if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM trips WHERE id = $1 AND user_id = $2)`, targetID, userID).Scan(&targetExists); err != nil || !targetExists {
		return utils.ErrTripNotFound
	}
	filtered := []int{}
	for _, id := range sourceIDs {
		if id != targetID {
			filtered = append(filtered, id)
		}
	}
	if len(filtered) == 0 {
		return utils.ErrInvalidInput
	}
	var sourceCount int
	if err := tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM trips WHERE user_id = $1 AND id = ANY($2)`, userID, pq.Array(filtered)).Scan(&sourceCount); err != nil {
		return utils.ErrDatabaseError
	}
	if sourceCount != len(filtered) {
		return utils.ErrTripNotFound
	}
	if _, err := tx.ExecContext(ctx, `UPDATE dives SET trip_id = $1, updated_at = NOW() WHERE user_id = $2 AND trip_id = ANY($3)`, targetID, userID, pq.Array(filtered)); err != nil {
		return utils.ErrDatabaseError
	}
	if _, err := tx.ExecContext(ctx, `DELETE FROM trips WHERE user_id = $1 AND id = ANY($2)`, userID, pq.Array(filtered)); err != nil {
		return utils.ErrDatabaseError
	}
	if err := tx.Commit(); err != nil {
		return utils.ErrDatabaseError
	}
	return nil
}

func (r *LogbookRepository) SplitTrip(ctx context.Context, userID, sourceID int, request models.SplitTripRequest) (*models.Trip, error) {
	tx, err := r.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	defer tx.Rollback()
	trip := &models.Trip{}
	var location, start, end, notes sql.NullString
	err = tx.QueryRowContext(ctx, `
		INSERT INTO trips (user_id, name, location, start_date, end_date, notes)
		SELECT $1, $2, $3, $4, $5, $6 WHERE EXISTS (SELECT 1 FROM trips WHERE id = $7 AND user_id = $1)
		RETURNING id, user_id, name, location, start_date::text, end_date::text, notes, 0`,
		userID, strings.TrimSpace(request.Trip.Name), optionalText(request.Trip.Location), optionalText(request.Trip.StartDate), optionalText(request.Trip.EndDate), optionalText(request.Trip.Notes), sourceID,
	).Scan(&trip.ID, &trip.UserID, &trip.Name, &location, &start, &end, &notes, &trip.DiveCount)
	if err == sql.ErrNoRows {
		return nil, utils.ErrTripNotFound
	}
	if isUniqueViolation(err) {
		return nil, utils.ErrOrganizationConflict
	}
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	result, err := tx.ExecContext(ctx, `
		UPDATE dives SET trip_id = $1, updated_at = NOW()
		WHERE user_id = $2 AND trip_id = $3 AND id = ANY($4)`, trip.ID, userID, sourceID, pq.Array(request.DiveIDs))
	if err != nil {
		return nil, utils.ErrDatabaseError
	}
	affected, _ := result.RowsAffected()
	if affected != int64(len(request.DiveIDs)) {
		return nil, utils.ErrInvalidInput
	}
	if err := tx.Commit(); err != nil {
		return nil, utils.ErrDatabaseError
	}
	trip.Location, trip.StartDate, trip.EndDate, trip.Notes = nullStringPointer(location), nullStringPointer(start), nullStringPointer(end), nullStringPointer(notes)
	trip.DiveCount = int(affected)
	return trip, nil
}

func (r *LogbookRepository) RenumberDives(ctx context.Context, userID int, request models.RenumberDivesRequest) (int64, error) {
	query := `
		WITH numbered AS (
			SELECT id, ($2 + (ROW_NUMBER() OVER (ORDER BY dive_datetime, id) - 1) * $3)::INTEGER AS next_number
			FROM dives WHERE user_id = $1`
	args := []interface{}{userID, request.StartNumber, request.Increment}
	if request.Scope == "range" {
		query += ` AND dive_datetime::date BETWEEN $4::date AND $5::date`
		args = append(args, *request.FromDate, *request.ToDate)
	}
	query += `) UPDATE dives d SET dive_number = numbered.next_number, updated_at = NOW() FROM numbered WHERE d.id = numbered.id`
	result, err := r.db.ExecContext(ctx, query, args...)
	if err != nil {
		return 0, utils.ErrDatabaseError
	}
	count, err := result.RowsAffected()
	if err != nil {
		return 0, utils.ErrDatabaseError
	}
	return count, nil
}

func isUniqueViolation(err error) bool {
	var pqError *pq.Error
	return err != nil && errors.As(err, &pqError) && pqError.Code == "23505"
}
