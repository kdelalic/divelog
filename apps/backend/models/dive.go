package models

import (
	"database/sql/driver"
	"divelog-backend/utils"
	"encoding/json"
	"time"
)

// LocalTime is a custom time type that marshals without timezone information
type LocalTime struct {
	time.Time
}

// MarshalJSON formats time without timezone
func (lt LocalTime) MarshalJSON() ([]byte, error) {
	// Format as ISO 8601 without timezone suffix
	formatted := lt.Time.Format("2006-01-02T15:04:05")
	return json.Marshal(formatted)
}

// UnmarshalJSON parses time from JSON
func (lt *LocalTime) UnmarshalJSON(data []byte) error {
	var timeStr string
	if err := json.Unmarshal(data, &timeStr); err != nil {
		return err
	}
	parsedTime := utils.ParseDateTime(timeStr)
	lt.Time = parsedTime
	return nil
}

// Scan implements the sql.Scanner interface for database reads
func (lt *LocalTime) Scan(value interface{}) error {
	if value == nil {
		lt.Time = time.Time{}
		return nil
	}

	switch v := value.(type) {
	case time.Time:
		lt.Time = v
		return nil
	default:
		lt.Time = time.Time{}
		return nil
	}
}

// Value implements the driver.Valuer interface for database writes
func (lt LocalTime) Value() (driver.Value, error) {
	return lt.Time, nil
}

// DiveSample represents a single data point in a dive profile
type DiveSample struct {
	Time        int      `json:"time"`                  // Time in seconds from dive start
	Depth       float64  `json:"depth"`                 // Depth in meters
	Temperature *float64 `json:"temperature,omitempty"` // Temperature in celsius
	Pressure    *float64 `json:"pressure,omitempty"`    // Tank pressure in bar
}

// GasMix represents breathing gas composition
type GasMix struct {
	Oxygen   int     `json:"oxygen"`             // O2 percentage (21 for air, 32 for EANx32, etc.)
	Helium   *int    `json:"helium,omitempty"`   // He percentage (for trimix)
	Nitrogen *int    `json:"nitrogen,omitempty"` // N2 percentage (calculated automatically)
	Name     *string `json:"name,omitempty"`     // Custom name (e.g., "EANx32", "Trimix 18/45")
}

// Tank represents a diving tank/cylinder
type Tank struct {
	ID              *int    `json:"id,omitempty"`
	Name            *string `json:"name,omitempty"`     // Tank identifier
	Size            float64 `json:"size"`               // Tank volume in liters
	WorkingPressure float64 `json:"working_pressure"`   // Working pressure in bar
	StartPressure   float64 `json:"start_pressure"`     // Starting pressure in bar
	EndPressure     float64 `json:"end_pressure"`       // Ending pressure in bar
	GasMix          GasMix  `json:"gas_mix"`            // Gas mix used
	Material        *string `json:"material,omitempty"` // Tank material (steel/aluminum)
}

// Wetsuit represents exposure protection
type Wetsuit struct {
	Type      string  `json:"type"`                // wetsuit/drysuit/shorty/none
	Thickness *int    `json:"thickness,omitempty"` // Thickness in mm
	Material  *string `json:"material,omitempty"`  // Neoprene, etc.
}

// Equipment represents all diving equipment used
type Equipment struct {
	Tanks     []Tank   `json:"tanks"`               // Multiple tanks for technical diving
	BCD       *string  `json:"bcd,omitempty"`       // BCD model/type
	Regulator *string  `json:"regulator,omitempty"` // Regulator model/type
	Wetsuit   *Wetsuit `json:"wetsuit,omitempty"`   // Exposure protection
	Weights   *float64 `json:"weights,omitempty"`   // Weight carried in kg
	Fins      *string  `json:"fins,omitempty"`      // Fins model
	Mask      *string  `json:"mask,omitempty"`      // Mask model
	Computer  *string  `json:"computer,omitempty"`  // Dive computer model
	Notes     *string  `json:"notes,omitempty"`     // Additional equipment notes
}

// DiveConditions represents environmental conditions
type DiveConditions struct {
	WaterTempSurface *float64 `json:"water_temp_surface,omitempty"` // Surface temperature in celsius
	WaterTempBottom  *float64 `json:"water_temp_bottom,omitempty"`  // Bottom temperature in celsius
	AirTemp          *float64 `json:"air_temp,omitempty"`           // Air temperature in celsius
	Visibility       *float64 `json:"visibility,omitempty"`         // Visibility in meters
	CurrentStrength  *string  `json:"current_strength,omitempty"`   // none/light/moderate/strong
	CurrentDirection *string  `json:"current_direction,omitempty"`  // Direction or description
	Weather          *string  `json:"weather,omitempty"`            // sunny/cloudy/overcast/rainy/windy
	SeaState         *int     `json:"sea_state,omitempty"`          // Sea state scale 0-9
	Surge            *string  `json:"surge,omitempty"`              // none/light/moderate/heavy
}

// DiveComputerIdentity retains stable device information independently from
// the free-form equipment description.
type DiveComputerIdentity struct {
	Vendor   *string `json:"vendor,omitempty"`
	Model    *string `json:"model,omitempty"`
	DeviceID *string `json:"device_id,omitempty"`
	Serial   *string `json:"serial,omitempty"`
	Firmware *string `json:"firmware,omitempty"`
}

// SafetyStop represents a safety stop during the dive
type SafetyStop struct {
	Depth    float64 `json:"depth"`    // Safety stop depth in meters
	Duration int     `json:"duration"` // Safety stop duration in minutes
}

// Trip groups dives that belong to the same journey or diving event.
type Trip struct {
	ID        int     `json:"id" db:"id"`
	UserID    int     `json:"user_id" db:"user_id"`
	Name      string  `json:"name" db:"name"`
	Location  *string `json:"location,omitempty" db:"location"`
	StartDate *string `json:"start_date,omitempty" db:"start_date"`
	EndDate   *string `json:"end_date,omitempty" db:"end_date"`
	Notes     *string `json:"notes,omitempty" db:"notes"`
	DiveCount int     `json:"dive_count,omitempty" db:"dive_count"`
}

// TripRequest is the writable portion of a trip. It is also embedded in
// imported dives so a batch restore can recreate a trip before assigning it.
type TripRequest struct {
	Name      string  `json:"name"`
	Location  *string `json:"location,omitempty"`
	StartDate *string `json:"start_date,omitempty"`
	EndDate   *string `json:"end_date,omitempty"`
	Notes     *string `json:"notes,omitempty"`
}

// TagSummary describes a reusable tag and how many dives currently use it.
type TagSummary struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	DiveCount int    `json:"dive_count"`
}

// Dive represents a dive record
type Dive struct {
	ID              int                   `json:"id" db:"id"`
	UserID          int                   `json:"user_id" db:"user_id"`
	DiveSiteID      *int                  `json:"dive_site_id,omitempty" db:"dive_site_id"`
	DiveNumber      *int                  `json:"dive_number,omitempty" db:"dive_number"`
	TripID          *int                  `json:"trip_id,omitempty" db:"trip_id"`
	Trip            *Trip                 `json:"trip,omitempty"`
	Tags            []string              `json:"tags,omitempty"`
	DateTime        LocalTime             `json:"datetime" db:"dive_datetime"`
	MaxDepth        float64               `json:"depth" db:"max_depth"`
	MeanDepth       *float64              `json:"mean_depth,omitempty" db:"mean_depth"`
	Duration        int                   `json:"duration" db:"duration"`
	SurfaceInterval *int                  `json:"surface_interval,omitempty"`
	Buddy           *string               `json:"buddy,omitempty" db:"buddy"`
	WaterTemp       *float64              `json:"water_temperature,omitempty" db:"water_temperature"`
	Visibility      *int                  `json:"visibility,omitempty" db:"visibility"`
	Notes           *string               `json:"notes,omitempty" db:"notes"`
	Latitude        float64               `json:"lat" db:"latitude"`
	Longitude       float64               `json:"lng" db:"longitude"`
	Location        string                `json:"location" db:"location"`
	Samples         []DiveSample          `json:"samples,omitempty" db:"samples"`       // Dive profile samples
	Equipment       *Equipment            `json:"equipment,omitempty" db:"equipment"`   // Equipment used on dive
	Conditions      *DiveConditions       `json:"conditions,omitempty" db:"conditions"` // Environmental conditions
	DiveType        *string               `json:"dive_type,omitempty" db:"dive_type"`   // recreational/training/technical/work/research
	DiveMode        *string               `json:"dive_mode,omitempty" db:"dive_mode"`   // OC/freedive/CCR/pSCR
	Computer        *DiveComputerIdentity `json:"computer_metadata,omitempty" db:"computer_metadata"`
	Rating          *int                  `json:"rating,omitempty" db:"rating"`             // Dive rating 1-5 stars
	SafetyStops     []SafetyStop          `json:"safety_stops,omitempty" db:"safety_stops"` // Safety stops performed
	CreatedAt       time.Time             `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time             `json:"updated_at" db:"updated_at"`
}

// DiveRequest represents the request body for creating/updating dives
type DiveRequest struct {
	DateTime    string                `json:"datetime"` // ISO 8601 format
	Location    string                `json:"location"`
	Depth       float64               `json:"depth"`
	MeanDepth   *float64              `json:"mean_depth,omitempty"`
	Duration    int                   `json:"duration"`
	Buddy       *string               `json:"buddy,omitempty"`
	Lat         float64               `json:"lat"`
	Lng         float64               `json:"lng"`
	WaterTemp   *float64              `json:"water_temperature,omitempty"`
	Visibility  *int                  `json:"visibility,omitempty"`
	Notes       *string               `json:"notes,omitempty"`
	Samples     []DiveSample          `json:"samples,omitempty"`
	Equipment   *Equipment            `json:"equipment,omitempty"`
	Conditions  *DiveConditions       `json:"conditions,omitempty"`
	DiveType    *string               `json:"dive_type,omitempty"`
	DiveMode    *string               `json:"dive_mode,omitempty"`
	Computer    *DiveComputerIdentity `json:"computer_metadata,omitempty"`
	Rating      *int                  `json:"rating,omitempty"`
	SafetyStops []SafetyStop          `json:"safety_stops,omitempty"`
	DiveNumber  *int                  `json:"dive_number,omitempty"`
	TripID      *int                  `json:"trip_id,omitempty"`
	Trip        *TripRequest          `json:"trip,omitempty"`
	Tags        []string              `json:"tags,omitempty"`
}

// ToDive converts a DiveRequest to Dive
func (dr *DiveRequest) ToDive(userID int) *Dive {
	dive := &Dive{
		UserID:      userID,
		DateTime:    LocalTime{utils.ParseDateTime(dr.DateTime)},
		Location:    dr.Location,
		MaxDepth:    dr.Depth,
		MeanDepth:   dr.MeanDepth,
		Duration:    dr.Duration,
		Buddy:       dr.Buddy,
		Latitude:    dr.Lat,
		Longitude:   dr.Lng,
		WaterTemp:   dr.WaterTemp,
		Visibility:  dr.Visibility,
		Notes:       dr.Notes,
		Samples:     dr.Samples,
		Equipment:   dr.Equipment,
		Conditions:  dr.Conditions,
		DiveType:    dr.DiveType,
		DiveMode:    dr.DiveMode,
		Computer:    dr.Computer,
		Rating:      dr.Rating,
		SafetyStops: dr.SafetyStops,
		DiveNumber:  dr.DiveNumber,
		TripID:      dr.TripID,
		Tags:        dr.Tags,
	}
	if dive.MeanDepth == nil {
		dive.MeanDepth = CalculateMeanDepth(dive.Samples)
	}
	if dr.Trip != nil {
		dive.Trip = &Trip{
			Name: dr.Trip.Name, Location: dr.Trip.Location, StartDate: dr.Trip.StartDate,
			EndDate: dr.Trip.EndDate, Notes: dr.Trip.Notes,
		}
	}
	return dive
}

// CalculateMeanDepth returns a time-weighted mean using trapezoidal segments.
// It is deterministic for imported profiles and avoids overweighting devices
// that sample more frequently during only part of a dive.
func CalculateMeanDepth(samples []DiveSample) *float64 {
	if len(samples) == 0 {
		return nil
	}
	if len(samples) == 1 {
		value := samples[0].Depth
		return &value
	}
	weighted, elapsed := 0.0, 0
	for i := 1; i < len(samples); i++ {
		delta := samples[i].Time - samples[i-1].Time
		if delta <= 0 {
			continue
		}
		weighted += (samples[i-1].Depth + samples[i].Depth) / 2 * float64(delta)
		elapsed += delta
	}
	if elapsed == 0 {
		return nil
	}
	value := weighted / float64(elapsed)
	return &value
}

// DiveSite represents a dive site
type DiveSite struct {
	ID          int       `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Latitude    float64   `json:"latitude" db:"latitude"`
	Longitude   float64   `json:"longitude" db:"longitude"`
	Description *string   `json:"description,omitempty" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// DiveSiteRequest represents the request body for creating/updating dive sites
type DiveSiteRequest struct {
	Name        string  `json:"name"`
	Latitude    float64 `json:"latitude"`
	Longitude   float64 `json:"longitude"`
	Description *string `json:"description,omitempty"`
}

// ToDiveSite converts a DiveSiteRequest to DiveSite
func (dsr *DiveSiteRequest) ToDiveSite() *DiveSite {
	return &DiveSite{
		Name:        dsr.Name,
		Latitude:    dsr.Latitude,
		Longitude:   dsr.Longitude,
		Description: dsr.Description,
	}
}
