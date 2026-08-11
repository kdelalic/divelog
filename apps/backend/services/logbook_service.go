package services

import (
	"context"
	"divelog-backend/models"
)

type LogbookRepository interface {
	GetTags(context.Context, int) ([]models.TagSummary, error)
	CreateTag(context.Context, int, string) (*models.TagSummary, error)
	UpdateTag(context.Context, int, int, string) (*models.TagSummary, error)
	DeleteTag(context.Context, int, int) error
	GetTrips(context.Context, int) ([]models.Trip, error)
	CreateTrip(context.Context, int, models.TripRequest) (*models.Trip, error)
	UpdateTrip(context.Context, int, int, models.TripRequest) (*models.Trip, error)
	DeleteTrip(context.Context, int, int) error
	MergeTrips(context.Context, int, int, []int) error
	SplitTrip(context.Context, int, int, models.SplitTripRequest) (*models.Trip, error)
	RenumberDives(context.Context, int, models.RenumberDivesRequest) (int64, error)
	BulkUpdateDives(context.Context, int, models.BulkDiveUpdateRequest) (int64, error)
	BulkDeleteDives(context.Context, int, []int) (int64, error)
	ShiftDiveTimes(context.Context, int, models.ShiftDiveTimesRequest) (*models.BulkOperation, error)
	LatestUndoableOperation(context.Context, int) (*models.BulkOperation, error)
	UndoBulkOperation(context.Context, int, string) (*models.BulkOperation, error)
}

type LogbookService struct {
	repository LogbookRepository
}

func NewLogbookService(repository LogbookRepository) *LogbookService {
	return &LogbookService{repository: repository}
}

func (s *LogbookService) GetTags(ctx context.Context, userID int) ([]models.TagSummary, error) {
	return s.repository.GetTags(ctx, userID)
}
func (s *LogbookService) CreateTag(ctx context.Context, userID int, request models.TagRequest) (*models.TagSummary, error) {
	return s.repository.CreateTag(ctx, userID, request.Name)
}
func (s *LogbookService) UpdateTag(ctx context.Context, userID, id int, request models.TagRequest) (*models.TagSummary, error) {
	return s.repository.UpdateTag(ctx, userID, id, request.Name)
}
func (s *LogbookService) DeleteTag(ctx context.Context, userID, id int) error {
	return s.repository.DeleteTag(ctx, userID, id)
}
func (s *LogbookService) GetTrips(ctx context.Context, userID int) ([]models.Trip, error) {
	return s.repository.GetTrips(ctx, userID)
}
func (s *LogbookService) CreateTrip(ctx context.Context, userID int, request models.TripRequest) (*models.Trip, error) {
	return s.repository.CreateTrip(ctx, userID, request)
}
func (s *LogbookService) UpdateTrip(ctx context.Context, userID, id int, request models.TripRequest) (*models.Trip, error) {
	return s.repository.UpdateTrip(ctx, userID, id, request)
}
func (s *LogbookService) DeleteTrip(ctx context.Context, userID, id int) error {
	return s.repository.DeleteTrip(ctx, userID, id)
}
func (s *LogbookService) MergeTrips(ctx context.Context, userID, targetID int, request models.MergeTripsRequest) error {
	return s.repository.MergeTrips(ctx, userID, targetID, request.SourceTripIDs)
}
func (s *LogbookService) SplitTrip(ctx context.Context, userID, sourceID int, request models.SplitTripRequest) (*models.Trip, error) {
	return s.repository.SplitTrip(ctx, userID, sourceID, request)
}
func (s *LogbookService) RenumberDives(ctx context.Context, userID int, request models.RenumberDivesRequest) (int64, error) {
	return s.repository.RenumberDives(ctx, userID, request)
}
func (s *LogbookService) BulkUpdateDives(ctx context.Context, userID int, request models.BulkDiveUpdateRequest) (int64, error) {
	return s.repository.BulkUpdateDives(ctx, userID, request)
}
func (s *LogbookService) BulkDeleteDives(ctx context.Context, userID int, request models.BulkDiveDeleteRequest) (int64, error) {
	return s.repository.BulkDeleteDives(ctx, userID, request.DiveIDs)
}
func (s *LogbookService) ShiftDiveTimes(ctx context.Context, userID int, request models.ShiftDiveTimesRequest) (*models.BulkOperation, error) {
	return s.repository.ShiftDiveTimes(ctx, userID, request)
}
func (s *LogbookService) LatestUndoableOperation(ctx context.Context, userID int) (*models.BulkOperation, error) {
	return s.repository.LatestUndoableOperation(ctx, userID)
}
func (s *LogbookService) UndoBulkOperation(ctx context.Context, userID int, operationID string) (*models.BulkOperation, error) {
	return s.repository.UndoBulkOperation(ctx, userID, operationID)
}
