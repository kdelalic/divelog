package models

import (
	"time"
)

// UserSettings represents user preferences and settings
type UserSettings struct {
	ID     int `json:"id" db:"id"`
	UserID int `json:"user_id" db:"user_id"`

	// Unit preferences
	UnitPreference  string `json:"unit_preference" db:"unit_preference"`
	DepthUnit       string `json:"depth_unit" db:"depth_unit"`
	TemperatureUnit string `json:"temperature_unit" db:"temperature_unit"`
	DistanceUnit    string `json:"distance_unit" db:"distance_unit"`
	WeightUnit      string `json:"weight_unit" db:"weight_unit"`
	PressureUnit    string `json:"pressure_unit" db:"pressure_unit"`
	VolumeUnit      string `json:"volume_unit" db:"volume_unit"`

	// Display preferences
	DateFormat        string `json:"date_format" db:"date_format"`
	TimeFormat        string `json:"time_format" db:"time_format"`
	DefaultVisibility string `json:"default_visibility" db:"default_visibility"`

	// Diving preferences
	ShowBuddyReminders  bool   `json:"show_buddy_reminders" db:"show_buddy_reminders"`
	AutoCalculateNitrox bool   `json:"auto_calculate_nitrox" db:"auto_calculate_nitrox"`
	DefaultGasMix       string `json:"default_gas_mix" db:"default_gas_mix"`
	MaxDepthWarning     int    `json:"max_depth_warning" db:"max_depth_warning"`

	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// SettingsRequest represents the request body for updating settings
type SettingsRequest struct {
	UnitPreference string `json:"unitPreference"`
	Units struct {
		Depth       string `json:"depth"`
		Temperature string `json:"temperature"`
		Distance    string `json:"distance"`
		Weight      string `json:"weight"`
		Pressure    string `json:"pressure"`
		Volume      string `json:"volume"`
	} `json:"units"`
	Preferences struct {
		DateFormat        string `json:"dateFormat"`
		TimeFormat        string `json:"timeFormat"`
		DefaultVisibility string `json:"defaultVisibility"`
	} `json:"preferences"`
	Dive struct {
		ShowBuddyReminders  bool   `json:"showBuddyReminders"`
		AutoCalculateNitrox bool   `json:"autoCalculateNitrox"`
		DefaultGasMix       string `json:"defaultGasMix"`
		MaxDepthWarning     int    `json:"maxDepthWarning"`
	} `json:"dive"`
}

// ToUserSettings converts a SettingsRequest to UserSettings
func (sr *SettingsRequest) ToUserSettings(userID int) *UserSettings {
	return &UserSettings{
		UserID:              userID,
		UnitPreference:      sr.UnitPreference,
		DepthUnit:           sr.Units.Depth,
		TemperatureUnit:     sr.Units.Temperature,
		DistanceUnit:        sr.Units.Distance,
		WeightUnit:          sr.Units.Weight,
		PressureUnit:        sr.Units.Pressure,
		VolumeUnit:          sr.Units.Volume,
		DateFormat:          sr.Preferences.DateFormat,
		TimeFormat:          sr.Preferences.TimeFormat,
		DefaultVisibility:   sr.Preferences.DefaultVisibility,
		ShowBuddyReminders:  sr.Dive.ShowBuddyReminders,
		AutoCalculateNitrox: sr.Dive.AutoCalculateNitrox,
		DefaultGasMix:       sr.Dive.DefaultGasMix,
		MaxDepthWarning:     sr.Dive.MaxDepthWarning,
	}
}

// ToFrontendFormat converts UserSettings to the format expected by the frontend
func (us *UserSettings) ToFrontendFormat() map[string]interface{} {
	return map[string]interface{}{
		"unitPreference": us.UnitPreference,
		"units": map[string]string{
			"depth":       us.DepthUnit,
			"temperature": us.TemperatureUnit,
			"distance":    us.DistanceUnit,
			"weight":      us.WeightUnit,
			"pressure":    us.PressureUnit,
			"volume":      us.VolumeUnit,
		},
		"preferences": map[string]string{
			"dateFormat":        us.DateFormat,
			"timeFormat":        us.TimeFormat,
			"defaultVisibility": us.DefaultVisibility,
		},
		"dive": map[string]interface{}{
			"showBuddyReminders":  us.ShowBuddyReminders,
			"autoCalculateNitrox": us.AutoCalculateNitrox,
			"defaultGasMix":       us.DefaultGasMix,
			"maxDepthWarning":     us.MaxDepthWarning,
		},
	}
}