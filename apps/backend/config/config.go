package config

import (
	"errors"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Port        string
	GinMode     string
	JWTSecret   string
	CORSOrigin  string
}

// devJWTSecret is only used when JWT_SECRET is unset outside release mode.
const devJWTSecret = "dev-insecure-jwt-secret-do-not-use-in-production"

func Load() (*Config, error) {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		// Not a fatal error - .env file is optional
	}

	cfg := &Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        getEnvWithDefault("PORT", "8080"),
		GinMode:     os.Getenv("GIN_MODE"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		CORSOrigin:  getEnvWithDefault("CORS_ORIGIN", "http://localhost:5173"),
	}

	if cfg.JWTSecret == "" {
		if cfg.GinMode == "release" {
			return nil, errors.New("JWT_SECRET must be set in release mode")
		}
		cfg.JWTSecret = devJWTSecret
	}

	return cfg, nil
}

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
