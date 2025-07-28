package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRequireUserID_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Set("user_id", 1)
	
	userID, ok := RequireUserID(c)
	
	assert.True(t, ok)
	assert.Equal(t, 1, userID)
}

func TestRequireUserID_Missing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	// Don't set user_id
	
	userID, ok := RequireUserID(c)
	
	assert.False(t, ok)
	assert.Equal(t, 0, userID)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestRequireUserID_WrongType(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("user_id", "not_an_int")
	
	userID, ok := RequireUserID(c)
	
	assert.False(t, ok)
	assert.Equal(t, 0, userID)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestUserValidation_Middleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(UserValidation())
	router.GET("/test", func(c *gin.Context) {
		userID, ok := RequireUserID(c)
		if !ok {
			return
		}
		c.JSON(http.StatusOK, gin.H{"user_id": userID})
	})
	
	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Should set default user_id to 1 for development
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "\"user_id\":1")
}

func TestUserValidation_WithHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(UserValidation())
	router.GET("/test", func(c *gin.Context) {
		userID, ok := RequireUserID(c)
		if !ok {
			return
		}
		c.JSON(http.StatusOK, gin.H{"user_id": userID})
	})
	
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-User-ID", "5")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "\"user_id\":5")
}

func TestUserValidation_InvalidHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(UserValidation())
	router.GET("/test", func(c *gin.Context) {
		userID, ok := RequireUserID(c)
		if !ok {
			return
		}
		c.JSON(http.StatusOK, gin.H{"user_id": userID})
	})
	
	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("X-User-ID", "invalid")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	
	// Should fall back to default user_id 1
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "\"user_id\":1")
}