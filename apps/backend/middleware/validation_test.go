package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSecurityHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(SecurityHeaders())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})
	
	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "nosniff", w.Header().Get("X-Content-Type-Options"))
	assert.Equal(t, "1; mode=block", w.Header().Get("X-XSS-Protection"))
	assert.Equal(t, "DENY", w.Header().Get("X-Frame-Options"))
}

func TestRequestSizeLimiter_WithinLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(RequestSizeLimiter(1024)) // 1KB limit
	router.POST("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})
	
	// Send request with small body (within limit)
	body := strings.Repeat("a", 512) // 512 bytes
	req, _ := http.NewRequest("POST", "/test", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequestSizeLimiter_ExceedsLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(RequestSizeLimiter(1024)) // 1KB limit
	router.POST("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})
	
	// Send request with large body (exceeds limit)
	body := strings.Repeat("a", 2048) // 2KB
	req, _ := http.NewRequest("POST", "/test", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusRequestEntityTooLarge, w.Code)
}

func TestRateLimiter_WithinLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(RateLimiter(10, time.Minute)) // 10 requests per minute
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})
	
	// Send multiple requests within limit
	for i := 0; i < 5; i++ {
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.1:8080"
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		assert.Equal(t, http.StatusOK, w.Code)
	}
}

func TestRateLimiter_ExceedsLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(RateLimiter(2, time.Minute)) // Very low limit for testing
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})
	
	// Send requests to exceed limit
	for i := 0; i < 3; i++ {
		req, _ := http.NewRequest("GET", "/test", nil)
		req.RemoteAddr = "192.168.1.1:8080"
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		
		if i < 2 {
			assert.Equal(t, http.StatusOK, w.Code)
		} else {
			assert.Equal(t, http.StatusTooManyRequests, w.Code)
		}
	}
}

func TestRateLimiter_DifferentIPs(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(RateLimiter(1, time.Minute)) // 1 request per minute
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})
	
	// Different IPs should have separate limits
	req1, _ := http.NewRequest("GET", "/test", nil)
	req1.RemoteAddr = "192.168.1.1:8080"
	w1 := httptest.NewRecorder()
	router.ServeHTTP(w1, req1)
	assert.Equal(t, http.StatusOK, w1.Code)
	
	req2, _ := http.NewRequest("GET", "/test", nil)
	req2.RemoteAddr = "192.168.1.2:8080"
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, req2)
	assert.Equal(t, http.StatusOK, w2.Code)
}

func TestGetClientIP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// Test with X-Forwarded-For header
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.1, 192.168.1.1")
	req.RemoteAddr = "10.0.0.1:8080"
	
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = req
	
	ip := getClientIP(c)
	assert.Equal(t, "203.0.113.1", ip)
}

func TestGetClientIP_XRealIP(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// Test with X-Real-IP header
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-Real-IP", "203.0.113.2")
	req.RemoteAddr = "10.0.0.1:8080"
	
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = req
	
	ip := getClientIP(c)
	assert.Equal(t, "203.0.113.2", ip)
}

func TestGetClientIP_RemoteAddr(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	// Test with only RemoteAddr
	req, _ := http.NewRequest("GET", "/test", nil)
	req.RemoteAddr = "10.0.0.1:8080"
	
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = req
	
	ip := getClientIP(c)
	assert.Equal(t, "10.0.0.1", ip)
}