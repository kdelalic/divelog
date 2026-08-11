package handlers

import (
	"divelog-backend/middleware"
	"divelog-backend/models"
	"divelog-backend/utils"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"
)

type DiveHandler struct {
	service diveService
}

func NewDiveHandler(service diveService) *DiveHandler {
	return &DiveHandler{service: service}
}

func (h *DiveHandler) GetDives(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	dives, err := h.service.GetDives(c.Request.Context(), userID)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error getting dives for user", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve dives"})
		return
	}
	c.JSON(http.StatusOK, dives)
}

func (h *DiveHandler) CreateDive(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	var request models.DiveRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}

	dive, err := h.service.CreateDive(c.Request.Context(), userID, request)
	if err != nil {
		if err == utils.ErrDuplicateDive {
			respondDuplicateDive(c, request)
			return
		}
		utils.LogError(c.Request.Context(), "Error creating dive", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create dive"})
		return
	}
	c.JSON(http.StatusCreated, dive)
}

func (h *DiveHandler) CreateMultipleDives(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	var requests []models.DiveRequest
	if !middleware.BindJSON(c, &requests) {
		return
	}
	validationErrors := utils.ValidationErrors{}
	if len(requests) == 0 {
		validationErrors.Add("dives", "must contain at least one dive")
	}
	for i := range requests {
		validationErrors.Merge(fmt.Sprintf("dives[%d]", i), requests[i].Validate())
	}
	if !middleware.RespondValidationErrors(c, validationErrors) {
		return
	}

	result, err := h.service.CreateMultipleDives(c.Request.Context(), userID, requests)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error creating multiple dives", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save dives"})
		return
	}

	response := gin.H{
		"created":       result.Created,
		"created_count": len(result.Created),
	}
	if len(result.Skipped) > 0 {
		response["skipped"] = result.Skipped
		response["skipped_count"] = len(result.Skipped)
	}
	c.JSON(http.StatusCreated, response)
}

func (h *DiveHandler) UpdateDive(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	diveID, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}

	var request models.DiveRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}

	dive, err := h.service.UpdateDive(c.Request.Context(), diveID, userID, request)
	if err != nil {
		switch err {
		case utils.ErrDiveNotFound:
			c.JSON(http.StatusNotFound, gin.H{"error": "Dive not found"})
		case utils.ErrDuplicateDive:
			respondDuplicateDive(c, request)
		default:
			utils.LogError(c.Request.Context(), "Error updating dive", err, utils.UserID(userID), utils.DiveID(diveID))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update dive"})
		}
		return
	}
	c.JSON(http.StatusOK, dive)
}

func (h *DiveHandler) DeleteDive(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	diveID, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}

	if err := h.service.DeleteDive(c.Request.Context(), diveID, userID); err != nil {
		if err == utils.ErrDiveNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Dive not found"})
			return
		}
		utils.LogError(c.Request.Context(), "Error deleting dive", err, utils.UserID(userID), utils.DiveID(diveID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dive"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Dive deleted successfully"})
}

func (h *DiveHandler) DeleteAllDives(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	deleted, err := h.service.DeleteAllDives(c.Request.Context(), userID)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error deleting all dives", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dives"})
		return
	}
	utils.LogInfo(c.Request.Context(), "Deleted all dives for user", utils.UserID(userID), slog.Int64("deleted_count", deleted))
	c.JSON(http.StatusOK, gin.H{"message": "All dives deleted successfully", "deleted_count": deleted})
}

func respondDuplicateDive(c *gin.Context, request models.DiveRequest) {
	c.JSON(http.StatusConflict, gin.H{
		"error":   "A dive already exists for this date and location",
		"details": gin.H{"date": request.DateTime, "location": request.Location},
	})
}
