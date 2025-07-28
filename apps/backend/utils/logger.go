package utils

import (
	"context"
	"log/slog"
	"os"
)

var logger *slog.Logger

// InitLogger initializes the structured logger
func InitLogger(env string) {
	var handler slog.Handler

	if env == "production" {
		handler = slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		})
	} else {
		handler = slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelDebug,
		})
	}

	logger = slog.New(handler)
	slog.SetDefault(logger)
}

// LogError logs an error with context
func LogError(ctx context.Context, msg string, err error, attrs ...slog.Attr) {
	if logger == nil {
		InitLogger("development")
	}
	
	args := make([]any, 0, len(attrs)*2+2)
	args = append(args, "error", err)
	
	for _, attr := range attrs {
		args = append(args, attr.Key, attr.Value)
	}
	
	logger.ErrorContext(ctx, msg, args...)
}

// LogInfo logs an info message with context
func LogInfo(ctx context.Context, msg string, attrs ...slog.Attr) {
	if logger == nil {
		InitLogger("development")
	}
	
	args := make([]any, 0, len(attrs)*2)
	for _, attr := range attrs {
		args = append(args, attr.Key, attr.Value)
	}
	
	logger.InfoContext(ctx, msg, args...)
}

// LogDebug logs a debug message with context
func LogDebug(ctx context.Context, msg string, attrs ...slog.Attr) {
	if logger == nil {
		InitLogger("development")
	}
	
	args := make([]any, 0, len(attrs)*2)
	for _, attr := range attrs {
		args = append(args, attr.Key, attr.Value)
	}
	
	logger.DebugContext(ctx, msg, args...)
}

// LogWarn logs a warning message with context
func LogWarn(ctx context.Context, msg string, attrs ...slog.Attr) {
	if logger == nil {
		InitLogger("development")
	}
	
	args := make([]any, 0, len(attrs)*2)
	for _, attr := range attrs {
		args = append(args, attr.Key, attr.Value)
	}
	
	logger.WarnContext(ctx, msg, args...)
}

// Helper functions for common attributes
func UserID(id int) slog.Attr {
	return slog.Int("user_id", id)
}

func DiveID(id int) slog.Attr {
	return slog.Int("dive_id", id)
}

func DiveSiteID(id int) slog.Attr {
	return slog.Int("dive_site_id", id)
}

func RequestID(id string) slog.Attr {
	return slog.String("request_id", id)
}