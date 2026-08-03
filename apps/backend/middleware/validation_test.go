package middleware

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestSecurityHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(SecurityHeaders())
	router.GET("/test", func(context *gin.Context) { context.Status(http.StatusNoContent) })

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/test", nil))

	assert.Equal(t, "nosniff", recorder.Header().Get("X-Content-Type-Options"))
	assert.Equal(t, "DENY", recorder.Header().Get("X-Frame-Options"))
	assert.Equal(t, "strict-origin-when-cross-origin", recorder.Header().Get("Referrer-Policy"))
}

func TestRequestSizeLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequestSizeLimit(8))
	router.POST("/test", func(context *gin.Context) {
		body, err := io.ReadAll(context.Request.Body)
		if err != nil {
			context.Status(http.StatusRequestEntityTooLarge)
			return
		}
		context.JSON(http.StatusOK, gin.H{"length": len(body)})
	})

	withinLimit := httptest.NewRecorder()
	router.ServeHTTP(withinLimit, httptest.NewRequest(http.MethodPost, "/test", strings.NewReader("12345678")))
	assert.Equal(t, http.StatusOK, withinLimit.Code)

	overLimit := httptest.NewRecorder()
	router.ServeHTTP(overLimit, httptest.NewRequest(http.MethodPost, "/test", strings.NewReader("123456789")))
	assert.Equal(t, http.StatusRequestEntityTooLarge, overLimit.Code)
}

func TestRateLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RateLimit(2))
	router.GET("/test", func(context *gin.Context) { context.Status(http.StatusNoContent) })

	for requestNumber := 1; requestNumber <= 3; requestNumber++ {
		request := httptest.NewRequest(http.MethodGet, "/test", nil)
		request.RemoteAddr = "192.0.2.1:1234"
		recorder := httptest.NewRecorder()
		router.ServeHTTP(recorder, request)
		if requestNumber <= 2 {
			assert.Equal(t, http.StatusNoContent, recorder.Code)
		} else {
			assert.Equal(t, http.StatusTooManyRequests, recorder.Code)
		}
	}
}

func TestRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(RequestID())
	router.GET("/test", func(context *gin.Context) {
		context.JSON(http.StatusOK, gin.H{"request_id": context.GetString("request_id")})
	})

	recorder := httptest.NewRecorder()
	router.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/test", nil))
	assert.NotEmpty(t, recorder.Header().Get("X-Request-ID"))
}
