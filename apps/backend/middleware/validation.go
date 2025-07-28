package middleware

import (
	"divelog-backend/utils"
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// RequestSizeLimit middleware limits request body size
func RequestSizeLimit(maxSize int64) gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxSize)
		c.Next()
	})
}

// RateLimit middleware implements simple rate limiting (in-memory)
func RateLimit(requestsPerMinute int) gin.HandlerFunc {
	type client struct {
		requests int
		lastSeen time.Time
	}
	
	clients := make(map[string]*client)
	
	return gin.HandlerFunc(func(c *gin.Context) {
		clientIP := c.ClientIP()
		now := time.Now()
		
		// Clean up old entries periodically
		if len(clients) > 1000 {
			for ip, cl := range clients {
				if now.Sub(cl.lastSeen) > time.Minute*5 {
					delete(clients, ip)
				}
			}
		}
		
		cl, exists := clients[clientIP]
		if !exists {
			clients[clientIP] = &client{requests: 1, lastSeen: now}
			c.Next()
			return
		}
		
		// Reset counter if more than a minute has passed
		if now.Sub(cl.lastSeen) > time.Minute {
			cl.requests = 1
			cl.lastSeen = now
			c.Next()
			return
		}
		
		cl.requests++
		cl.lastSeen = now
		
		if cl.requests > requestsPerMinute {
			utils.LogWarn(c.Request.Context(), "Rate limit exceeded", 
				slog.String("client_ip", clientIP),
				slog.Int("requests", cl.requests))
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please slow down.",
			})
			c.Abort()
			return
		}
		
		c.Next()
	})
}

// RequestID middleware adds a unique request ID to each request
func RequestID() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		requestID := generateRequestID()
		c.Set("request_id", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	})
}

// SecurityHeaders middleware adds security headers
func SecurityHeaders() gin.HandlerFunc {
	return gin.HandlerFunc(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Next()
	})
}

// generateRequestID generates a unique request ID
func generateRequestID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(8)
}

// randomString generates a random string of specified length
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		b[i] = charset[time.Now().UnixNano()%int64(len(charset))]
	}
	return string(b)
}