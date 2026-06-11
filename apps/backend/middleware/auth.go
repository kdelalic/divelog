package middleware

import (
	"divelog-backend/auth"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates the Bearer access token and stores the
// authenticated user's ID in the context under "userID".
func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			c.Abort()
			return
		}

		tokenString, ok := strings.CutPrefix(authHeader, "Bearer ")
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authorization header must be a Bearer token"})
			c.Abort()
			return
		}

		userID, err := auth.ValidateAccessToken(tokenString, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}
