package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRequireUserIDSuccess(t *testing.T) {
	gin.SetMode(gin.TestMode)
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Set("userID", 7)

	userID, ok := RequireUserID(context)
	assert.True(t, ok)
	assert.Equal(t, 7, userID)
}

func TestRequireUserIDMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)

	userID, ok := RequireUserID(context)
	assert.False(t, ok)
	assert.Zero(t, userID)
	assert.Equal(t, http.StatusInternalServerError, recorder.Code)
}

func TestUserIDMiddleware(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(UserIDMiddleware())
	router.GET("/test", func(context *gin.Context) {
		userID, ok := RequireUserID(context)
		if ok {
			context.JSON(http.StatusOK, gin.H{"user_id": userID})
		}
	})

	request := httptest.NewRequest(http.MethodGet, "/test?user_id=5", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.JSONEq(t, `{"user_id":5}`, recorder.Body.String())
}

func TestUserIDMiddlewareRejectsMissingUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(UserIDMiddleware())
	router.GET("/test", func(context *gin.Context) { context.Status(http.StatusOK) })

	request := httptest.NewRequest(http.MethodGet, "/test", nil)
	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, request)

	assert.Equal(t, http.StatusBadRequest, recorder.Code)
}
