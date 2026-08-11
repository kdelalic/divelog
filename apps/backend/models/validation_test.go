package models

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func validDiveRequestForValidation() DiveRequest {
	return DiveRequest{
		DateTime: "2026-08-02T12:30:00-07:00",
		Location: "Monterey Bay",
		Depth:    30,
		Duration: 45,
		Lat:      36.6002,
		Lng:      -121.8947,
	}
}

func TestDiveRequestValidateAcceptsValidRequestAndZeroCoordinates(t *testing.T) {
	request := validDiveRequestForValidation()
	request.Lat = 0
	request.Lng = 0

	assert.Empty(t, request.Validate())
}

func TestDiveRequestValidateReportsCoreFields(t *testing.T) {
	request := validDiveRequestForValidation()
	request.DateTime = "tomorrow"
	request.Location = " "
	request.Depth = -1
	request.Duration = 0
	request.Lat = 90.1
	request.Lng = -180.1

	errors := request.Validate()
	assert.Contains(t, errors, "datetime")
	assert.Contains(t, errors, "location")
	assert.Contains(t, errors, "depth")
	assert.Contains(t, errors, "duration")
	assert.Contains(t, errors, "lat")
	assert.Contains(t, errors, "lng")
}

func TestDiveRequestValidateReportsNestedFields(t *testing.T) {
	request := validDiveRequestForValidation()
	helium := 60
	request.Equipment = &Equipment{Tanks: []Tank{{
		Size:            12,
		WorkingPressure: 232,
		StartPressure:   50,
		EndPressure:     100,
		GasMix:          GasMix{Oxygen: 50, Helium: &helium},
	}}}
	request.SafetyStops = []SafetyStop{{Depth: 0, Duration: 0}}

	errors := request.Validate()
	assert.Contains(t, errors, "equipment.tanks[0].end_pressure")
	assert.Contains(t, errors, "equipment.tanks[0].gas_mix")
	assert.Contains(t, errors, "safety_stops[0].depth")
	assert.Contains(t, errors, "safety_stops[0].duration")
}

func TestDiveRequestValidateOrganizationFields(t *testing.T) {
	request := validDiveRequestForValidation()
	zero := 0
	request.DiveNumber = &zero
	request.TripID = &zero
	request.Trip = &TripRequest{Name: "Same time"}
	request.Tags = []string{"Wreck", "wreck"}

	errors := request.Validate()
	assert.Contains(t, errors, "dive_number")
	assert.Contains(t, errors, "trip_id")
	assert.Contains(t, errors, "trip")
	assert.Contains(t, errors, "tags[1]")
}

func TestTripRequestValidateDateRange(t *testing.T) {
	start, end := "2026-08-10", "2026-08-01"
	request := TripRequest{Name: "Trip", StartDate: &start, EndDate: &end}
	assert.Contains(t, request.Validate(), "end_date")
}

func TestBulkDiveUpdateRequestValidate(t *testing.T) {
	tripID := 7
	rating := 4
	request := BulkDiveUpdateRequest{DiveIDs: []int{2, 3}, TripID: &tripID, AddTags: []string{"Wreck"}, Rating: &rating}
	assert.Empty(t, request.Validate())

	request.DiveIDs = []int{2, 2, 0}
	request.ClearTrip = true
	request.AddTags = []string{"wreck", "WRECK"}
	errors := request.Validate()
	assert.Contains(t, errors, "dive_ids[1]")
	assert.Contains(t, errors, "dive_ids[2]")
	assert.Contains(t, errors, "trip_id")
	assert.Contains(t, errors, "add_tags[1]")
}

func TestBulkDiveUpdateRequiresAChange(t *testing.T) {
	assert.Contains(t, (&BulkDiveUpdateRequest{DiveIDs: []int{1}}).Validate(), "changes")
	assert.Empty(t, (&BulkDiveDeleteRequest{DiveIDs: []int{1, 2}}).Validate())
}

func TestDiveSiteRequestValidate(t *testing.T) {
	request := DiveSiteRequest{Name: "", Latitude: 91, Longitude: -181}

	errors := request.Validate()
	assert.Contains(t, errors, "name")
	assert.Contains(t, errors, "latitude")
	assert.Contains(t, errors, "longitude")
}

func TestSettingsRequestValidateUsesSelectedDepthUnit(t *testing.T) {
	request := validSettingsRequestForValidation()
	request.Units.Depth = "feet"
	request.Dive.MaxDepthWarning = 330
	assert.Empty(t, request.Validate())

	request.Dive.MaxDepthWarning = 331
	assert.Contains(t, request.Validate(), "dive.maxDepthWarning")
}

func TestSettingsRequestValidateReportsEnumFields(t *testing.T) {
	request := validSettingsRequestForValidation()
	request.UnitPreference = "unknown"
	request.Preferences.DefaultVisibility = "friends"

	errors := request.Validate()
	assert.Contains(t, errors, "unitPreference")
	assert.Contains(t, errors, "preferences.defaultVisibility")
}

func validSettingsRequestForValidation() SettingsRequest {
	var request SettingsRequest
	request.UnitPreference = "metric"
	request.Units.Depth = "meters"
	request.Units.Temperature = "celsius"
	request.Units.Distance = "kilometers"
	request.Units.Weight = "kilograms"
	request.Units.Pressure = "bar"
	request.Units.Volume = "liters"
	request.Preferences.DateFormat = "ISO"
	request.Preferences.TimeFormat = "24h"
	request.Preferences.DefaultVisibility = "private"
	request.Dive.DefaultGasMix = "Air (21% O₂)"
	request.Dive.MaxDepthWarning = 40
	return request
}
