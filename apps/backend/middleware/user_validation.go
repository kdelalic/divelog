package middleware

import (
	"divelog-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// UserIDMiddleware validates and extracts user ID from query parameters
func UserIDMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, err := utils.ValidateUserID(c)
		if err != nil {
			// Error response already sent by ValidateUserID
			c.Abort()
			return
		}

		// Store user ID in context for handlers to use
		c.Set("userID", userID)
		c.Next()
	}
}

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
