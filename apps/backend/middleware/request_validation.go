package middleware

import (
	"divelog-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
)

// Validatable is implemented by API request models with domain validation.
type Validatable interface {
	Validate() utils.ValidationErrors
}

// BindJSON decodes a JSON request or writes a stable invalid-request response.
func BindJSON(c *gin.Context, destination interface{}) bool {
	if err := c.ShouldBindJSON(destination); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "invalid_request",
			"message": "Request body must contain valid JSON",
		})
		return false
	}
	return true
}

// ValidateRequest writes field-level validation errors when a request is invalid.
func ValidateRequest(c *gin.Context, request Validatable) bool {
	return RespondValidationErrors(c, request.Validate())
}

// BindAndValidateJSON decodes and validates a request model.
func BindAndValidateJSON(c *gin.Context, destination Validatable) bool {
	return BindJSON(c, destination) && ValidateRequest(c, destination)
}

// RespondValidationErrors writes a validation response and reports whether the
// request was valid.
func RespondValidationErrors(c *gin.Context, fields utils.ValidationErrors) bool {
	if len(fields) == 0 {
		return true
	}
	c.JSON(http.StatusBadRequest, gin.H{
		"error":   "validation_failed",
		"message": "Request validation failed",
		"fields":  fields,
	})
	return false
}
