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
	c.Set("userID", 1)

	userID, ok := RequireUserID(c)

	assert.True(t, ok)
	assert.Equal(t, 1, userID)
}

func TestRequireUserID_Missing(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	// Don't set userID

	userID, ok := RequireUserID(c)

	assert.False(t, ok)
	assert.Equal(t, 0, userID)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestRequireUserID_WrongType(t *testing.T) {
	gin.SetMode(gin.TestMode)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Set("userID", "not_an_int")

	userID, ok := RequireUserID(c)

	assert.False(t, ok)
	assert.Equal(t, 0, userID)
	assert.Equal(t, http.StatusInternalServerError, w.Code)
}

func TestUserIDMiddleware_ValidQueryParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(UserIDMiddleware())
	router.GET("/test", func(c *gin.Context) {
		userID, ok := RequireUserID(c)
		if !ok {
			return
		}
		c.JSON(http.StatusOK, gin.H{"user_id": userID})
	})

	req, _ := http.NewRequest("GET", "/test?user_id=5", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "\"user_id\":5")
}

func TestUserIDMiddleware_MissingQueryParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(UserIDMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUserIDMiddleware_InvalidQueryParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	router.Use(UserIDMiddleware())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	req, _ := http.NewRequest("GET", "/test?user_id=invalid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}
