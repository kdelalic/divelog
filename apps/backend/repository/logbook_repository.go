package repository

import (
	"context"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
	"errors"
	"strings"

	"github.com/lib/pq"
)

// LogbookRepository owns reusable tags, trips, and numbering operations.
type LogbookRepository struct {
	db *sql.DB
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
