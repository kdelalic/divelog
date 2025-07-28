package utils

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestInitLogger_Development(t *testing.T) {
	InitLogger("development")
	assert.NotNil(t, logger)
}

func TestInitLogger_Production(t *testing.T) {
	InitLogger("production")
	assert.NotNil(t, logger)
}

func TestInitLogger_Unknown(t *testing.T) {
	InitLogger("unknown")
	assert.NotNil(t, logger)
	// Should default to development mode
}

func TestLogError(t *testing.T) {
	InitLogger("development")
	ctx := context.Background()
	testErr := errors.New("test error")
	
	// This should not panic
	assert.NotPanics(t, func() {
		LogError(ctx, "Test error message", testErr)
	})
}

func TestLogError_WithAttributes(t *testing.T) {
	InitLogger("development")
	ctx := context.Background()
	testErr := errors.New("test error")
	
	// Test with additional attributes
	assert.NotPanics(t, func() {
		LogError(ctx, "Test error message", testErr, 
			slog.String("user_id", "123"),
			slog.String("dive_id", "456"))
	})
}

func TestLogError_WithNilLogger(t *testing.T) {
	// Reset logger to nil
	logger = nil
	
	ctx := context.Background()
	testErr := errors.New("test error")
	
	// Should initialize logger automatically
	assert.NotPanics(t, func() {
		LogError(ctx, "Test error message", testErr)
	})
	
	assert.NotNil(t, logger)
}

func TestLogInfo(t *testing.T) {
	InitLogger("development")
	ctx := context.Background()
	
	assert.NotPanics(t, func() {
		LogInfo(ctx, "Test info message")
	})
}

func TestLogInfo_WithAttributes(t *testing.T) {
	InitLogger("development")
	ctx := context.Background()
	
	assert.NotPanics(t, func() {
		LogInfo(ctx, "Test info message",
			slog.String("method", "GET"),
			slog.String("path", "/test"))
	})
}

func TestLogDebug(t *testing.T) {
	InitLogger("development")
	ctx := context.Background()
	
	assert.NotPanics(t, func() {
		LogDebug(ctx, "Test debug message")
	})
}

func TestLogWarn(t *testing.T) {
	InitLogger("development")
	ctx := context.Background()
	
	assert.NotPanics(t, func() {
		LogWarn(ctx, "Test warning message")
	})
}

func TestUserID(t *testing.T) {
	attr := UserID(123)
	assert.Equal(t, "user_id", attr.Key)
	assert.Equal(t, slog.IntValue(123), attr.Value)
}

func TestDiveID(t *testing.T) {
	attr := DiveID(456)
	assert.Equal(t, "dive_id", attr.Key)
	assert.Equal(t, slog.IntValue(456), attr.Value)
}

func TestDiveSiteID(t *testing.T) {
	attr := DiveSiteID(789)
	assert.Equal(t, "dive_site_id", attr.Key)
	assert.Equal(t, slog.IntValue(789), attr.Value)
}

func TestLoggerWithEnvironmentVariable(t *testing.T) {
	// Test with environment variable
	os.Setenv("ENVIRONMENT", "production")
	defer os.Unsetenv("ENVIRONMENT")
	
	InitLogger("")
	assert.NotNil(t, logger)
}

func TestLoggerConcurrency(t *testing.T) {
	InitLogger("development")
	ctx := context.Background()
	
	// Test concurrent logging
	done := make(chan bool, 10)
	
	for i := 0; i < 10; i++ {
		go func(i int) {
			LogInfo(ctx, "Concurrent log", slog.Int("routine", i))
			done <- true
		}(i)
	}
	
	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}
	
	// If we get here without panicking, the test passes
	assert.True(t, true)
}