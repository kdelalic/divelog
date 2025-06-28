package handlers

import (
	"database/sql"
	"divelog-backend/database"
	"divelog-backend/models"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetSettings retrieves user settings
func GetSettings(c *gin.Context) {
	userIDStr := c.DefaultQuery("user_id", "1") // Default to user 1 for development
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	settings, err := getUserSettings(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			// Create default settings for the user
			settings, err = createDefaultSettings(userID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create default settings"})
				return
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
			return
		}
	}

	c.JSON(http.StatusOK, settings.ToFrontendFormat())
}

// UpdateSettings updates user settings
func UpdateSettings(c *gin.Context) {
	userIDStr := c.DefaultQuery("user_id", "1") // Default to user 1 for development
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.SettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	settings := req.ToUserSettings(userID)
	
	err = updateUserSettings(settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	// Retrieve updated settings to return
	updatedSettings, err := getUserSettings(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated settings"})
		return
	}

	c.JSON(http.StatusOK, updatedSettings.ToFrontendFormat())
}

// getUserSettings retrieves settings for a user from the database
func getUserSettings(userID int) (*models.UserSettings, error) {
	query := `
		SELECT id, user_id, depth_unit, temperature_unit, distance_unit, weight_unit, pressure_unit,
		       date_format, time_format, default_visibility, show_buddy_reminders, auto_calculate_nitrox,
		       default_gas_mix, max_depth_warning, created_at, updated_at
		FROM user_settings WHERE user_id = $1
	`
	
	settings := &models.UserSettings{}
	row := database.DB.QueryRow(query, userID)
	
	err := row.Scan(
		&settings.ID, &settings.UserID, &settings.DepthUnit, &settings.TemperatureUnit,
		&settings.DistanceUnit, &settings.WeightUnit, &settings.PressureUnit,
		&settings.DateFormat, &settings.TimeFormat, &settings.DefaultVisibility,
		&settings.ShowBuddyReminders, &settings.AutoCalculateNitrox,
		&settings.DefaultGasMix, &settings.MaxDepthWarning,
		&settings.CreatedAt, &settings.UpdatedAt,
	)
	
	return settings, err
}

// createDefaultSettings creates default settings for a new user
func createDefaultSettings(userID int) (*models.UserSettings, error) {
	query := `
		INSERT INTO user_settings (user_id, depth_unit, temperature_unit, distance_unit, weight_unit, pressure_unit,
		                          date_format, time_format, default_visibility, show_buddy_reminders, auto_calculate_nitrox,
		                          default_gas_mix, max_depth_warning)
		VALUES ($1, 'meters', 'celsius', 'kilometers', 'kilograms', 'bar', 'ISO', '24h', 'private', true, false, 'Air (21% O₂)', 40)
		RETURNING id, created_at, updated_at
	`
	
	settings := &models.UserSettings{
		UserID:              userID,
		DepthUnit:           "meters",
		TemperatureUnit:     "celsius",
		DistanceUnit:        "kilometers",
		WeightUnit:          "kilograms",
		PressureUnit:        "bar",
		DateFormat:          "ISO",
		TimeFormat:          "24h",
		DefaultVisibility:   "private",
		ShowBuddyReminders:  true,
		AutoCalculateNitrox: false,
		DefaultGasMix:       "Air (21% O₂)",
		MaxDepthWarning:     40,
	}
	
	row := database.DB.QueryRow(query, userID)
	err := row.Scan(&settings.ID, &settings.CreatedAt, &settings.UpdatedAt)
	
	return settings, err
}

// updateUserSettings updates settings in the database
func updateUserSettings(settings *models.UserSettings) error {
	query := `
		UPDATE user_settings SET
			depth_unit = $2, temperature_unit = $3, distance_unit = $4, weight_unit = $5, pressure_unit = $6,
			date_format = $7, time_format = $8, default_visibility = $9, show_buddy_reminders = $10,
			auto_calculate_nitrox = $11, default_gas_mix = $12, max_depth_warning = $13, updated_at = $14
		WHERE user_id = $1
	`
	
	_, err := database.DB.Exec(query,
		settings.UserID, settings.DepthUnit, settings.TemperatureUnit, settings.DistanceUnit,
		settings.WeightUnit, settings.PressureUnit, settings.DateFormat, settings.TimeFormat,
		settings.DefaultVisibility, settings.ShowBuddyReminders, settings.AutoCalculateNitrox,
		settings.DefaultGasMix, settings.MaxDepthWarning, time.Now(),
	)
	
	return err
}