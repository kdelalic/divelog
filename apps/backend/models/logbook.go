package models

import (
	"divelog-backend/utils"
	"fmt"
	"strings"
)

type TagRequest struct {
	Name string `json:"name"`
}

func (request *TagRequest) Validate() utils.ValidationErrors {
	errors := utils.ValidationErrors{}
	utils.RequireString(errors, "name", request.Name, 100)
	return errors
}

type MergeTripsRequest struct {
	SourceTripIDs []int `json:"source_trip_ids"`
}

func (request *MergeTripsRequest) Validate() utils.ValidationErrors {
	errors := utils.ValidationErrors{}
	if len(request.SourceTripIDs) == 0 {
		errors.Add("source_trip_ids", "must contain at least one trip")
	}
	for _, id := range request.SourceTripIDs {
		if id <= 0 {
			errors.Add("source_trip_ids", "must contain only positive trip IDs")
			break
		}
	}
	return errors
}

type SplitTripRequest struct {
	DiveIDs []int       `json:"dive_ids"`
	Trip    TripRequest `json:"trip"`
}

func (request *SplitTripRequest) Validate() utils.ValidationErrors {
	errors := request.Trip.Validate()
	if len(request.DiveIDs) == 0 {
		errors.Add("dive_ids", "must contain at least one dive")
	}
	for _, id := range request.DiveIDs {
		if id <= 0 {
			errors.Add("dive_ids", "must contain only positive dive IDs")
			break
		}
	}
	return errors
}

type RenumberDivesRequest struct {
	Scope       string  `json:"scope"`
	StartNumber int     `json:"start_number"`
	Increment   int     `json:"increment"`
	FromDate    *string `json:"from_date,omitempty"`
	ToDate      *string `json:"to_date,omitempty"`
}

// BulkDiveUpdateRequest describes a partial update applied atomically to a
// selection of dives. The clear flags distinguish "leave unchanged" from
// deliberately clearing an optional value.
type BulkDiveUpdateRequest struct {
	DiveIDs       []int    `json:"dive_ids"`
	TripID        *int     `json:"trip_id,omitempty"`
	ClearTrip     bool     `json:"clear_trip,omitempty"`
	AddTags       []string `json:"add_tags,omitempty"`
	RemoveTags    []string `json:"remove_tags,omitempty"`
	Buddy         *string  `json:"buddy,omitempty"`
	ClearBuddy    bool     `json:"clear_buddy,omitempty"`
	DiveType      *string  `json:"dive_type,omitempty"`
	ClearDiveType bool     `json:"clear_dive_type,omitempty"`
	Rating        *int     `json:"rating,omitempty"`
	ClearRating   bool     `json:"clear_rating,omitempty"`
}

type BulkDiveDeleteRequest struct {
	DiveIDs []int `json:"dive_ids"`
}

func validateDiveIDs(errors utils.ValidationErrors, diveIDs []int) {
	if len(diveIDs) == 0 {
		errors.Add("dive_ids", "must contain at least one dive")
	}
	if len(diveIDs) > 1000 {
		errors.Add("dive_ids", "must contain at most 1000 dives")
	}
	seen := map[int]bool{}
	for i, id := range diveIDs {
		if id <= 0 {
			errors.Add(fmt.Sprintf("dive_ids[%d]", i), "must be a positive integer")
		}
		if seen[id] {
			errors.Add(fmt.Sprintf("dive_ids[%d]", i), "must not duplicate another dive ID")
		}
		seen[id] = true
	}
}

func validateBulkTags(errors utils.ValidationErrors, field string, tags []string) {
	seen := map[string]bool{}
	for i, tag := range tags {
		trimmed := strings.TrimSpace(tag)
		if trimmed == "" || len([]rune(trimmed)) > 100 {
			errors.Add(fmt.Sprintf("%s[%d]", field, i), "must be between 1 and 100 characters")
		}
		key := strings.ToLower(trimmed)
		if seen[key] {
			errors.Add(fmt.Sprintf("%s[%d]", field, i), "must not contain duplicates")
		}
		seen[key] = true
	}
}

func (request *BulkDiveUpdateRequest) Validate() utils.ValidationErrors {
	errors := utils.ValidationErrors{}
	validateDiveIDs(errors, request.DiveIDs)
	if request.TripID != nil && request.ClearTrip {
		errors.Add("trip_id", "cannot be supplied when clear_trip is true")
	}
	if request.TripID != nil && *request.TripID <= 0 {
		errors.Add("trip_id", "must be a positive integer")
	}
	if request.Buddy != nil && request.ClearBuddy {
		errors.Add("buddy", "cannot be supplied when clear_buddy is true")
	}
	utils.OptionalString(errors, "buddy", request.Buddy, 255)
	if request.DiveType != nil && request.ClearDiveType {
		errors.Add("dive_type", "cannot be supplied when clear_dive_type is true")
	}
	utils.OptionalOneOf(errors, "dive_type", request.DiveType,
		"recreational", "training", "technical", "work", "research")
	if request.Rating != nil && request.ClearRating {
		errors.Add("rating", "cannot be supplied when clear_rating is true")
	}
	optionalIntRange(errors, "rating", request.Rating, 1, 5)
	validateBulkTags(errors, "add_tags", request.AddTags)
	validateBulkTags(errors, "remove_tags", request.RemoveTags)

	hasChange := request.TripID != nil || request.ClearTrip || len(request.AddTags) > 0 || len(request.RemoveTags) > 0 ||
		request.Buddy != nil || request.ClearBuddy || request.DiveType != nil || request.ClearDiveType ||
		request.Rating != nil || request.ClearRating
	if !hasChange {
		errors.Add("changes", "must contain at least one change")
	}
	return errors
}

func (request *BulkDiveDeleteRequest) Validate() utils.ValidationErrors {
	errors := utils.ValidationErrors{}
	validateDiveIDs(errors, request.DiveIDs)
	return errors
}

func (request *RenumberDivesRequest) Validate() utils.ValidationErrors {
	errors := utils.ValidationErrors{}
	utils.OneOf(errors, "scope", request.Scope, "all", "range")
	utils.IntRange(errors, "start_number", request.StartNumber, 1, 10000000)
	utils.IntRange(errors, "increment", request.Increment, 1, 10000)
	start := validateDateOnly(errors, "from_date", request.FromDate)
	end := validateDateOnly(errors, "to_date", request.ToDate)
	if request.Scope == "range" && (request.FromDate == nil || request.ToDate == nil || strings.TrimSpace(*request.FromDate) == "" || strings.TrimSpace(*request.ToDate) == "") {
		errors.Add("range", "from_date and to_date are required for range renumbering")
	}
	if !start.IsZero() && !end.IsZero() && end.Before(start) {
		errors.Add("to_date", "must be on or after from_date")
	}
	return errors
}
