package models

import (
	"divelog-backend/utils"
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
