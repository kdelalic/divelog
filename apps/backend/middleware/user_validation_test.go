package middleware

import (
	"divelog-backend/auth"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

const testJWTSecret = "test-secret"

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

func authTestRouter() *gin.Engine {
	router := gin.New()
	router.Use(AuthMiddleware(testJWTSecret))
	router.GET("/test", func(c *gin.Context) {
		userID, ok := RequireUserID(c)
		if !ok {
			return
		}
		c.JSON(http.StatusOK, gin.H{"user_id": userID})
	})
	return router
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	token, err := auth.GenerateAccessToken(5, testJWTSecret)
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	authTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "\"user_id\":5")
}

func TestAuthMiddleware_MissingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	req, _ := http.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()
	authTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_MalformedHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "NotBearer something")
	w := httptest.NewRecorder()
	authTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer not-a-real-token")
	w := httptest.NewRecorder()
	authTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthMiddleware_WrongSecret(t *testing.T) {
	gin.SetMode(gin.TestMode)

	token, err := auth.GenerateAccessToken(5, "different-secret")
	assert.NoError(t, err)

	req, _ := http.NewRequest("GET", "/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	authTestRouter().ServeHTTP(w, req)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
