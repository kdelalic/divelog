package handlers

import (
	"divelog-backend/middleware"
	"divelog-backend/models"
	"divelog-backend/utils"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type SettingsHandler struct {
	settingsRepo settingsRepository
}

func NewSettingsHandler(settingsRepo settingsRepository) *SettingsHandler {
	return &SettingsHandler{
		settingsRepo: settingsRepo,
	}
}

// GetSettings retrieves user settings
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	userIDStr := c.DefaultQuery("user_id", "1") // Default to user 1 for development
	userID, err := strconv.Atoi(userIDStr)
	if err != nil || userID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	settings, err := h.settingsRepo.GetOrCreateDefault(c.Request.Context(), userID)
	if err != nil || userID <= 0 {
		utils.LogError(c.Request.Context(), "Error getting/creating settings for user", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}

	c.JSON(http.StatusOK, settings.ToFrontendFormat())
}

// UpdateSettings updates user settings
func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	userIDStr := c.DefaultQuery("user_id", "1") // Default to user 1 for development
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req models.SettingsRequest
	if !middleware.BindAndValidateJSON(c, &req) {
		return
	}

	settings := req.ToUserSettings(userID)

	err = h.settingsRepo.Update(c.Request.Context(), settings)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error updating settings for user", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings"})
		return
	}

	// Retrieve updated settings to return
	updatedSettings, err := h.settingsRepo.GetByUserID(c.Request.Context(), userID)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error retrieving updated settings for user", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve updated settings"})
		return
	}

	c.JSON(http.StatusOK, updatedSettings.ToFrontendFormat())
}
