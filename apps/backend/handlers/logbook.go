package handlers

import (
	"divelog-backend/middleware"
	"divelog-backend/models"
	"divelog-backend/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type LogbookHandler struct {
	service logbookService
}

func NewLogbookHandler(service logbookService) *LogbookHandler {
	return &LogbookHandler{service: service}
}

func (h *LogbookHandler) GetTags(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	items, err := h.service.GetTags(c.Request.Context(), userID)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}
func (h *LogbookHandler) CreateTag(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	var request models.TagRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	item, err := h.service.CreateTag(c.Request.Context(), userID, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}
func (h *LogbookHandler) UpdateTag(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	id, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}
	var request models.TagRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	item, err := h.service.UpdateTag(c.Request.Context(), userID, id, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}
func (h *LogbookHandler) DeleteTag(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	id, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}
	if err := h.service.DeleteTag(c.Request.Context(), userID, id); err != nil {
		respondLogbookError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
func (h *LogbookHandler) GetTrips(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	items, err := h.service.GetTrips(c.Request.Context(), userID)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, items)
}
func (h *LogbookHandler) CreateTrip(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	var request models.TripRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	item, err := h.service.CreateTrip(c.Request.Context(), userID, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}
func (h *LogbookHandler) UpdateTrip(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	id, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}
	var request models.TripRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	item, err := h.service.UpdateTrip(c.Request.Context(), userID, id, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, item)
}
func (h *LogbookHandler) DeleteTrip(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	id, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}
	if err := h.service.DeleteTrip(c.Request.Context(), userID, id); err != nil {
		respondLogbookError(c, err)
		return
	}
	c.Status(http.StatusNoContent)
}
func (h *LogbookHandler) MergeTrips(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	targetID, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}
	var request models.MergeTripsRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	if err := h.service.MergeTrips(c.Request.Context(), userID, targetID, request); err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Trips merged"})
}
func (h *LogbookHandler) SplitTrip(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	sourceID, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}
	var request models.SplitTripRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	item, err := h.service.SplitTrip(c.Request.Context(), userID, sourceID, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusCreated, item)
}
func (h *LogbookHandler) RenumberDives(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	var request models.RenumberDivesRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	count, err := h.service.RenumberDives(c.Request.Context(), userID, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"renumbered_count": count})
}

func (h *LogbookHandler) BulkUpdateDives(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	var request models.BulkDiveUpdateRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	count, err := h.service.BulkUpdateDives(c.Request.Context(), userID, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"updated_count": count})
}

func (h *LogbookHandler) BulkDeleteDives(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	var request models.BulkDiveDeleteRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	count, err := h.service.BulkDeleteDives(c.Request.Context(), userID, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{"deleted_count": count})
}

func (h *LogbookHandler) ShiftDiveTimes(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	var request models.ShiftDiveTimesRequest
	if !middleware.BindAndValidateJSON(c, &request) {
		return
	}
	operation, err := h.service.ShiftDiveTimes(c.Request.Context(), userID, request)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, operation)
}

func (h *LogbookHandler) LatestUndoableOperation(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	operation, err := h.service.LatestUndoableOperation(c.Request.Context(), userID)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	if operation == nil {
		c.Status(http.StatusNoContent)
		return
	}
	c.JSON(http.StatusOK, operation)
}

func (h *LogbookHandler) UndoBulkOperation(c *gin.Context) {
	userID, ok := middleware.RequireUserID(c)
	if !ok {
		return
	}
	operationID := strings.TrimSpace(c.Param("id"))
	if len(operationID) != 32 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid operation ID"})
		return
	}
	operation, err := h.service.UndoBulkOperation(c.Request.Context(), userID, operationID)
	if err != nil {
		respondLogbookError(c, err)
		return
	}
	c.JSON(http.StatusOK, operation)
}

func respondLogbookError(c *gin.Context, err error) {
	switch err {
	case utils.ErrTagNotFound, utils.ErrTripNotFound, utils.ErrDiveNotFound:
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case utils.ErrOrganizationConflict:
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case utils.ErrTimestampConflict, utils.ErrBulkOperationUndone:
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case utils.ErrBulkOperationNotFound:
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
	case utils.ErrInvalidInput:
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Logbook organization operation failed"})
	}
}
