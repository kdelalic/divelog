package utils

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// ValidateUserID extracts and validates user_id from query parameters
func ValidateUserID(c *gin.Context) (int, error) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return 0, ErrMissingUserID
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return 0, ErrInvalidUserID
	}

	return userID, nil
}

// ValidateIDParam extracts and validates an ID from URL parameters
func ValidateIDParam(c *gin.Context, paramName string) (int, error) {
	idStr := c.Param(paramName)
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid " + paramName})
		return 0, ErrInvalidID
	}
	return id, nil
}
