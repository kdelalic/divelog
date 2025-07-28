package config

import (
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	Port        string
	GinMode     string
}

func Load() (*Config, error) {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		// Not a fatal error - .env file is optional
	}

	return &Config{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Port:        getEnvWithDefault("PORT", "8080"),
		GinMode:     os.Getenv("GIN_MODE"),
	}, nil
}

func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
