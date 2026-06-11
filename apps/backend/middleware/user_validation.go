package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// GetUserIDFromContext retrieves the user ID from the Gin context
func GetUserIDFromContext(c *gin.Context) (int, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, false
	}

	if id, ok := userID.(int); ok {
		return id, true
	}

	return 0, false
}

// RequireUserID is a helper that gets user ID from context and returns error response if not found
func RequireUserID(c *gin.Context) (int, bool) {
	userID, exists := GetUserIDFromContext(c)
	if !exists {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user ID not found in context"})
		return 0, false
	}
	return userID, true
}
