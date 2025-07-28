package repository

import (
	"context"
	"database/sql"
	"divelog-backend/models"
	"divelog-backend/utils"
	"time"
)

type SettingsRepository struct {
	db *sql.DB
}

func NewSettingsRepository(db *sql.DB) *SettingsRepository {
	return &SettingsRepository{db: db}
}

// GetByUserID retrieves settings for a user from the database
func (r *SettingsRepository) GetByUserID(ctx context.Context, userID int) (*models.UserSettings, error) {
	query := `
		SELECT id, user_id, unit_preference, depth_unit, temperature_unit, distance_unit, weight_unit, pressure_unit, volume_unit,
		       date_format, time_format, default_visibility, show_buddy_reminders, auto_calculate_nitrox,
		       default_gas_mix, max_depth_warning, created_at, updated_at
		FROM user_settings WHERE user_id = $1
	`

	settings := &models.UserSettings{}
	row := r.db.QueryRow(query, userID)

	err := row.Scan(
		&settings.ID, &settings.UserID, &settings.UnitPreference, &settings.DepthUnit, &settings.TemperatureUnit,
		&settings.DistanceUnit, &settings.WeightUnit, &settings.PressureUnit, &settings.VolumeUnit,
		&settings.DateFormat, &settings.TimeFormat, &settings.DefaultVisibility,
		&settings.ShowBuddyReminders, &settings.AutoCalculateNitrox,
		&settings.DefaultGasMix, &settings.MaxDepthWarning,
		&settings.CreatedAt, &settings.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, utils.ErrDatabaseError // Will be handled as "not found"
		}
		utils.LogError(ctx, "Error getting user settings", err, utils.UserID(userID))
		return nil, utils.ErrDatabaseError
	}

	return settings, nil
}

// CreateDefault creates default settings for a new user
func (r *SettingsRepository) CreateDefault(ctx context.Context, userID int) (*models.UserSettings, error) {
	query := `
		INSERT INTO user_settings (user_id, unit_preference, depth_unit, temperature_unit, distance_unit, weight_unit, pressure_unit, volume_unit,
		                          date_format, time_format, default_visibility, show_buddy_reminders, auto_calculate_nitrox,
		                          default_gas_mix, max_depth_warning)
		VALUES ($1, 'metric', 'meters', 'celsius', 'kilometers', 'kilograms', 'bar', 'liters', 'ISO', '24h', 'private', true, false, 'Air (21% O₂)', 40)
		RETURNING id, created_at, updated_at
	`

	settings := &models.UserSettings{
		UserID:              userID,
		UnitPreference:      "metric",
		DepthUnit:           "meters",
		TemperatureUnit:     "celsius",
		DistanceUnit:        "kilometers",
		WeightUnit:          "kilograms",
		PressureUnit:        "bar",
		VolumeUnit:          "liters",
		DateFormat:          "ISO",
		TimeFormat:          "24h",
		DefaultVisibility:   "private",
		ShowBuddyReminders:  true,
		AutoCalculateNitrox: false,
		DefaultGasMix:       "Air (21% O₂)",
		MaxDepthWarning:     40,
	}

	row := r.db.QueryRow(query, userID)
	err := row.Scan(&settings.ID, &settings.CreatedAt, &settings.UpdatedAt)

	if err != nil {
		utils.LogError(ctx, "Error creating default settings", err, utils.UserID(userID))
		return nil, utils.ErrDatabaseError
	}

	return settings, nil
}

// Update updates settings in the database
func (r *SettingsRepository) Update(ctx context.Context, settings *models.UserSettings) error {
	query := `
		UPDATE user_settings SET
			unit_preference = $2, depth_unit = $3, temperature_unit = $4, distance_unit = $5, weight_unit = $6, pressure_unit = $7, volume_unit = $8,
			date_format = $9, time_format = $10, default_visibility = $11, show_buddy_reminders = $12,
			auto_calculate_nitrox = $13, default_gas_mix = $14, max_depth_warning = $15, updated_at = $16
		WHERE user_id = $1
	`

	_, err := r.db.Exec(query,
		settings.UserID, settings.UnitPreference, settings.DepthUnit, settings.TemperatureUnit, settings.DistanceUnit,
		settings.WeightUnit, settings.PressureUnit, settings.VolumeUnit, settings.DateFormat, settings.TimeFormat,
		settings.DefaultVisibility, settings.ShowBuddyReminders, settings.AutoCalculateNitrox,
		settings.DefaultGasMix, settings.MaxDepthWarning, time.Now(),
	)

	if err != nil {
		utils.LogError(ctx, "Error updating settings", err, utils.UserID(settings.UserID))
		return utils.ErrDatabaseError
	}

	return nil
}

// GetOrCreateDefault gets settings for a user, creating defaults if they don't exist
func (r *SettingsRepository) GetOrCreateDefault(ctx context.Context, userID int) (*models.UserSettings, error) {
	settings, err := r.GetByUserID(ctx, userID)
	if err != nil {
		// If no settings found, create defaults
		return r.CreateDefault(ctx, userID)
	}
	return settings, nil
}