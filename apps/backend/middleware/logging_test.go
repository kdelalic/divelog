package middleware

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRequestResponseLogger(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(RequestResponseLogger())
	router.POST("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})
	
	body := `{"test": "data"}`
	req, _ := http.NewRequest("POST", "/test", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "test-agent")
	w := httptest.NewRecorder()
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "success")
}

func TestRequestResponseLogger_WithQuery(t *testing.T) {
	gin.SetMode(gin.TestMode)
	
	router := gin.New()
	router.Use(RequestResponseLogger())
	router.GET("/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"query": c.Query("param")})
	})
	
	req, _ := http.NewRequest("GET", "/test?param=value", nil)
	w := httptest.NewRecorder()
	
	router.ServeHTTP(w, req)
	
	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "value")
}

func TestFormatBodyForLog_Empty(t *testing.T) {
	result := formatBodyForLog([]byte{}, "application/json")
	assert.Equal(t, "<empty>", result)
}

func TestFormatBodyForLog_JSON(t *testing.T) {
	jsonBody := `{"test":"value","number":123}`
	result := formatBodyForLog([]byte(jsonBody), "application/json")
	
	// Should format as pretty JSON
	assert.Contains(t, result, "{\n")
	assert.Contains(t, result, "  \"test\": \"value\"")
}

func TestFormatBodyForLog_NonJSON(t *testing.T) {
	textBody := "plain text content"
	result := formatBodyForLog([]byte(textBody), "text/plain")
	
	assert.Equal(t, textBody, result)
}

func TestFormatBodyForLog_LargeBody(t *testing.T) {
	// Create body larger than maxLogSize (1000)
	largeBody := make([]byte, 1500)
	for i := range largeBody {
		largeBody[i] = 'a'
	}
	
	result := formatBodyForLog(largeBody, "text/plain")
	
	assert.Less(t, len(result), 1100) // Should be truncated
	assert.Contains(t, result, "... (truncated)")
}

func TestIsValidJSON_Valid(t *testing.T) {
	validJSON := `{"test": "value", "number": 123}`
	assert.True(t, isValidJSON([]byte(validJSON)))
}

func TestIsValidJSON_Invalid(t *testing.T) {
	invalidJSON := `{"test": invalid json}`
	assert.False(t, isValidJSON([]byte(invalidJSON)))
}

func TestIsValidJSON_Empty(t *testing.T) {
	assert.False(t, isValidJSON([]byte{}))
}

func TestMinFunction(t *testing.T) {
	assert.Equal(t, 5, min(5, 10))
	assert.Equal(t, 3, min(10, 3))
	assert.Equal(t, 7, min(7, 7))
}