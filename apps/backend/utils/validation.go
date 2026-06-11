package utils

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

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
