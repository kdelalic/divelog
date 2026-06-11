package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

const testOrigin = "http://localhost:5173"

func corsTestRouter() *gin.Engine {
	router := gin.New()
	router.Use(CORS(testOrigin))
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "test"})
	})
	return router
}

func TestCORSMiddleware_AllowedOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", testOrigin)
	w := httptest.NewRecorder()
	corsTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, testOrigin, w.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", w.Header().Get("Access-Control-Allow-Credentials"))
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Headers"), "Content-Type")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Headers"), "Authorization")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "GET")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "POST")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "PUT")
	assert.Contains(t, w.Header().Get("Access-Control-Allow-Methods"), "DELETE")
}

func TestCORSMiddleware_DisallowedOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	w := httptest.NewRecorder()
	corsTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
	assert.Empty(t, w.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORSMiddleware_OptionsRequest(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Test OPTIONS request (preflight)
	req, _ := http.NewRequest("OPTIONS", "/test", nil)
	req.Header.Set("Origin", testOrigin)
	req.Header.Set("Access-Control-Request-Method", "POST")
	req.Header.Set("Access-Control-Request-Headers", "Content-Type")
	w := httptest.NewRecorder()
	corsTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, testOrigin, w.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORSMiddleware_WithoutOrigin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Same-origin request without Origin header still succeeds
	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	corsTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
}
