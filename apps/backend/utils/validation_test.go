package utils

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestValidateIDParam(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		paramValue     string
		expectedID     int
		expectedStatus int
		shouldError    bool
	}{
		{
			name:           "Valid ID parameter",
			paramValue:     "456",
			expectedID:     456,
			expectedStatus: 0,
			shouldError:    false,
		},
		{
			name:           "Invalid ID parameter",
			paramValue:     "xyz",
			expectedID:     0,
			expectedStatus: http.StatusBadRequest,
			shouldError:    true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Params = gin.Params{
				{Key: "id", Value: tt.paramValue},
			}

			id, err := ValidateIDParam(c, "id")

			if tt.shouldError {
				if err == nil {
					t.Errorf("Expected error but got none")
				}
				if w.Code != tt.expectedStatus {
					t.Errorf("Expected status %d, got %d", tt.expectedStatus, w.Code)
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if id != tt.expectedID {
					t.Errorf("Expected ID %d, got %d", tt.expectedID, id)
				}
			}
		})
	}
}