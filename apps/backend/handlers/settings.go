package handlers

import (
	"divelog-backend/middleware"
	"divelog-backend/models"
	"divelog-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type SettingsHandler struct {
	settingsRepo SettingsRepository
}

func NewSettingsHandler(settingsRepo SettingsRepository) *SettingsHandler {
	return &SettingsHandler{
		settingsRepo: settingsRepo,
	}
}

// GetSettings retrieves user settings
func (h *SettingsHandler) GetSettings(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	settings, err := h.settingsRepo.GetOrCreateDefault(c.Request.Context(), userID)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error getting/creating settings for user", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve settings"})
		return
	}

	c.JSON(http.StatusOK, settings.ToFrontendFormat())
}

// UpdateSettings updates user settings
func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	var req models.SettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	settings := req.ToUserSettings(userID)

	err := h.settingsRepo.Update(c.Request.Context(), settings)
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
