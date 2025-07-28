package handlers

import (
	"divelog-backend/middleware"
	"divelog-backend/models"
	"divelog-backend/repository"
	"divelog-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

type DiveHandler struct {
	diveRepo     *repository.DiveRepository
	diveSiteRepo *repository.DiveSiteRepository
}

func NewDiveHandler(diveRepo *repository.DiveRepository, diveSiteRepo *repository.DiveSiteRepository) *DiveHandler {
	return &DiveHandler{
		diveRepo:     diveRepo,
		diveSiteRepo: diveSiteRepo,
	}
}

// GetDives retrieves all dives for a user
func (h *DiveHandler) GetDives(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	dives, err := h.diveRepo.GetDivesByUserID(c.Request.Context(), userID)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error getting dives for user", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve dives"})
		return
	}

	c.JSON(http.StatusOK, dives)
}

// CreateDive creates a new dive
func (h *DiveHandler) CreateDive(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	var diveReq models.DiveRequest
	if err := c.ShouldBindJSON(&diveReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create dive from request
	dive := diveReq.ToDive(userID)

	// Find or create dive site
	diveSite, err := h.diveSiteRepo.FindOrCreateDiveSite(c.Request.Context(), diveReq.Location, diveReq.Lat, diveReq.Lng)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error finding/creating dive site", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process dive site"})
		return
	}
	dive.DiveSiteID = &diveSite.ID

	// Check for duplicate dive
	isDuplicate, err := h.diveRepo.CheckDuplicateDive(c.Request.Context(), userID, diveSite.ID, diveReq.DateTime)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error checking duplicate dive", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicate dive"})
		return
	}

	if isDuplicate {
		c.JSON(http.StatusConflict, gin.H{
			"error": "A dive already exists for this date and location",
			"details": map[string]interface{}{
				"date":     diveReq.DateTime,
				"location": diveReq.Location,
			},
		})
		return
	}

	// Create the dive
	if err := h.diveRepo.CreateDive(c.Request.Context(), dive); err != nil {
		utils.LogError(c.Request.Context(), "Error creating dive", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create dive"})
		return
	}

	// Set response data
	dive.Location = diveReq.Location
	dive.Latitude = diveReq.Lat
	dive.Longitude = diveReq.Lng

	c.JSON(http.StatusCreated, dive)
}

// CreateMultipleDives creates multiple dives in a batch (for imports)
func (h *DiveHandler) CreateMultipleDives(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	var diveReqs []models.DiveRequest
	if err := c.ShouldBindJSON(&diveReqs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(diveReqs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no dives provided"})
		return
	}

	// Process and validate dives
	var dives []*models.Dive
	var skippedDives []map[string]interface{}

	for _, diveReq := range diveReqs {
		dive := diveReq.ToDive(userID)

		// Find or create dive site
		diveSite, err := h.diveSiteRepo.FindOrCreateDiveSite(c.Request.Context(), diveReq.Location, diveReq.Lat, diveReq.Lng)
		if err != nil {
			utils.LogError(c.Request.Context(), "Error finding/creating dive site in batch", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process dive site"})
			return
		}
		dive.DiveSiteID = &diveSite.ID

		// Check for duplicate dive
		isDuplicate, err := h.diveRepo.CheckDuplicateDive(c.Request.Context(), userID, diveSite.ID, diveReq.DateTime)
		if err != nil {
			utils.LogError(c.Request.Context(), "Error checking duplicate dive in batch", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicate dive"})
			return
		}

		if isDuplicate {
			// Skip duplicate dive but continue with others
			skippedDives = append(skippedDives, map[string]interface{}{
				"date":     diveReq.DateTime,
				"location": diveReq.Location,
				"reason":   "duplicate",
			})
			continue
		}

		// Set location data for response
		dive.Location = diveReq.Location
		dive.Latitude = diveReq.Lat
		dive.Longitude = diveReq.Lng

		dives = append(dives, dive)
	}

	// Create the dives
	createdDives, _, err := h.diveRepo.CreateMultipleDives(c.Request.Context(), dives)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error creating multiple dives", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save dives"})
		return
	}

	// Return response with created dives and skipped information
	response := map[string]interface{}{
		"created":       createdDives,
		"created_count": len(createdDives),
	}

	if len(skippedDives) > 0 {
		response["skipped"] = skippedDives
		response["skipped_count"] = len(skippedDives)
	}

	c.JSON(http.StatusCreated, response)
}

// UpdateDive updates an existing dive
func (h *DiveHandler) UpdateDive(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	diveID, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}

	var diveReq models.DiveRequest
	if err := c.ShouldBindJSON(&diveReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get current dive to compare changes
	currentDive, err := h.diveRepo.GetCurrentDive(c.Request.Context(), diveID, userID)
	if err != nil {
		if err == utils.ErrDiveNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Dive not found"})
			return
		}
		utils.LogError(c.Request.Context(), "Error getting current dive", err, utils.UserID(userID), utils.DiveID(diveID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get current dive"})
		return
	}

	// Parse new datetime for comparison
	newDateTime := utils.ParseDateTime(diveReq.DateTime)
	locationChanged := currentDive.Latitude != diveReq.Lat || currentDive.Longitude != diveReq.Lng
	dateChanged := currentDive.DateTime.Time.Format("2006-01-02") != newDateTime.Format("2006-01-02")

	var diveSite *models.DiveSite
	if locationChanged || dateChanged {
		// Find or create dive site for updated dive
		diveSite, err = h.diveSiteRepo.FindOrCreateDiveSite(c.Request.Context(), diveReq.Location, diveReq.Lat, diveReq.Lng)
		if err != nil {
			utils.LogError(c.Request.Context(), "Error finding/creating dive site for update", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process dive site"})
			return
		}

		// Check for duplicate dive (excluding current dive)
		isDuplicate, err := h.diveRepo.CheckDuplicateDiveForUpdateByLocation(c.Request.Context(), userID, diveReq.Lat, diveReq.Lng, diveReq.DateTime, diveID)
		if err != nil {
			utils.LogError(c.Request.Context(), "Error checking duplicate dive for update", err, utils.UserID(userID), utils.DiveID(diveID))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicate dive"})
			return
		}

		if isDuplicate {
			c.JSON(http.StatusConflict, gin.H{
				"error": "A dive already exists for this date and location",
				"details": map[string]interface{}{
					"date":     diveReq.DateTime,
					"location": diveReq.Location,
				},
			})
			return
		}
	} else {
		// Location and date haven't changed, get existing dive site
		diveSiteID, err := h.diveSiteRepo.GetDiveSiteByDiveID(c.Request.Context(), diveID)
		if err != nil {
			utils.LogError(c.Request.Context(), "Error getting dive site ID", err, utils.UserID(userID), utils.DiveID(diveID))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get dive site"})
			return
		}

		if diveSiteID != nil {
			diveSite, err = h.diveSiteRepo.GetByID(c.Request.Context(), *diveSiteID)
			if err != nil && err != utils.ErrDiveSiteNotFound {
				utils.LogError(c.Request.Context(), "Error loading existing dive site", err, utils.UserID(userID), utils.DiveID(diveID))
			}
		}

		// If we couldn't find the existing dive site, create one
		if diveSite == nil {
			diveSite, err = h.diveSiteRepo.FindOrCreateDiveSite(c.Request.Context(), diveReq.Location, diveReq.Lat, diveReq.Lng)
			if err != nil {
				utils.LogError(c.Request.Context(), "Error finding/creating dive site for update", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process dive site"})
				return
			}
		}
	}

	// Create updated dive object
	dive := diveReq.ToDive(userID)
	dive.DiveSiteID = &diveSite.ID

	// Update the dive
	if err := h.diveRepo.UpdateDive(c.Request.Context(), diveID, userID, dive); err != nil {
		if err == utils.ErrDiveNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Dive not found"})
			return
		}
		utils.LogError(c.Request.Context(), "Error updating dive", err, utils.UserID(userID), utils.DiveID(diveID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update dive"})
		return
	}

	// Set location data for response
	dive.Location = diveReq.Location
	dive.Latitude = diveReq.Lat
	dive.Longitude = diveReq.Lng

	c.JSON(http.StatusOK, dive)
}

// DeleteDive deletes a dive
func (h *DiveHandler) DeleteDive(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}

	diveID, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}

	if err := h.diveRepo.DeleteDive(c.Request.Context(), diveID, userID); err != nil {
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
