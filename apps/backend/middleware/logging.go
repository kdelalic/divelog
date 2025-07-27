package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type bodyLogWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

func (w bodyLogWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func RequestResponseLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		
		// Read request body
		var requestBody []byte
		if c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		// Capture response body
		blw := &bodyLogWriter{
			ResponseWriter: c.Writer,
			body:           bytes.NewBufferString(""),
		}
		c.Writer = blw

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(start)

		// Log request details
		logRequest(c, requestBody, blw.body.Bytes(), duration)
	}
}

func logRequest(c *gin.Context, requestBody []byte, responseBody []byte, duration time.Duration) {
	method := c.Request.Method
	path := c.Request.URL.Path
	query := c.Request.URL.RawQuery
	statusCode := c.Writer.Status()
	clientIP := c.ClientIP()
	userAgent := c.Request.UserAgent()

	// Format request body for logging
	requestBodyStr := formatBodyForLog(requestBody, "application/json")
	
	// Format response body for logging
	responseBodyStr := formatBodyForLog(responseBody, c.Writer.Header().Get("Content-Type"))

	// Build query string
	fullPath := path
	if query != "" {
		fullPath = fmt.Sprintf("%s?%s", path, query)
	}

	// Log the request/response
	log.Printf(`
=== API Request ===
Method: %s
Path: %s
Status: %d
Duration: %v
Client IP: %s
User-Agent: %s
Request Body: %s
Response Body: %s
==================`,
		method,
		fullPath,
		statusCode,
		duration,
		clientIP,
		userAgent,
		requestBodyStr,
		responseBodyStr,
	)
}

func formatBodyForLog(body []byte, contentType string) string {
	if len(body) == 0 {
		return "<empty>"
	}

	// Limit body size for logging (max 1000 characters)
	maxLogSize := 1000
	bodyStr := string(body)
	
	if len(bodyStr) > maxLogSize {
		bodyStr = bodyStr[:maxLogSize] + "... (truncated)"
	}

	// Try to format as JSON if it's JSON content
	if strings.Contains(contentType, "application/json") || 
	   (contentType == "" && isValidJSON(body)) {
		var prettyJSON bytes.Buffer
		if err := json.Indent(&prettyJSON, body[:min(len(body), maxLogSize)], "", "  "); err == nil {
			return prettyJSON.String()
		}
	}

	return bodyStr
}

func isValidJSON(data []byte) bool {
	var js json.RawMessage
	return json.Unmarshal(data, &js) == nil
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}