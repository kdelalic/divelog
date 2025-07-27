package models

import (
	"time"
)

// Dive represents a dive record
type Dive struct {
	ID             int       `json:"id" db:"id"`
	UserID         int       `json:"user_id" db:"user_id"`
	DiveSiteID     *int      `json:"dive_site_id,omitempty" db:"dive_site_id"`
	Date           string    `json:"date" db:"dive_date"`
	MaxDepth       float64   `json:"depth" db:"max_depth"`
	Duration       int       `json:"duration" db:"duration"`
	Buddy          *string   `json:"buddy,omitempty" db:"buddy"`
	WaterTemp      *float64  `json:"water_temperature,omitempty" db:"water_temperature"`
	Visibility     *int      `json:"visibility,omitempty" db:"visibility"`
	Notes          *string   `json:"notes,omitempty" db:"notes"`
	Latitude       float64   `json:"lat" db:"latitude"`
	Longitude      float64   `json:"lng" db:"longitude"`
	Location       string    `json:"location" db:"location"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time `json:"updated_at" db:"updated_at"`
}

// DiveRequest represents the request body for creating/updating dives
type DiveRequest struct {
	Date      string   `json:"date" binding:"required"`
	Location  string   `json:"location" binding:"required"`
	Depth     float64  `json:"depth" binding:"required"`
	Duration  int      `json:"duration" binding:"required"`
	Buddy     *string  `json:"buddy,omitempty"`
	Lat       float64  `json:"lat" binding:"required"`
	Lng       float64  `json:"lng" binding:"required"`
	WaterTemp *float64 `json:"water_temperature,omitempty"`
	Visibility *int    `json:"visibility,omitempty"`
	Notes     *string  `json:"notes,omitempty"`
}

// ToDive converts a DiveRequest to Dive
func (dr *DiveRequest) ToDive(userID int) *Dive {
	return &Dive{
		UserID:     userID,
		Date:       dr.Date,
		Location:   dr.Location,
		MaxDepth:   dr.Depth,
		Duration:   dr.Duration,
		Buddy:      dr.Buddy,
		Latitude:   dr.Lat,
		Longitude:  dr.Lng,
		WaterTemp:  dr.WaterTemp,
		Visibility: dr.Visibility,
		Notes:      dr.Notes,
	}
}

// DiveSite represents a dive site
type DiveSite struct {
	ID          int     `json:"id" db:"id"`
	Name        string  `json:"name" db:"name"`
	Latitude    float64 `json:"latitude" db:"latitude"`
	Longitude   float64 `json:"longitude" db:"longitude"`
	Description *string `json:"description,omitempty" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// DiveSiteRequest represents the request body for creating/updating dive sites
type DiveSiteRequest struct {
	Name        string  `json:"name" binding:"required"`
	Latitude    float64 `json:"latitude" binding:"required"`
	Longitude   float64 `json:"longitude" binding:"required"`
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