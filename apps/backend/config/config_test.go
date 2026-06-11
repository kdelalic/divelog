package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad_DefaultValues(t *testing.T) {
	os.Unsetenv("DATABASE_URL")
	os.Unsetenv("PORT")
	os.Unsetenv("GIN_MODE")
	os.Unsetenv("JWT_SECRET")
	os.Unsetenv("CORS_ORIGIN")

	cfg, err := Load()

	assert.NoError(t, err)
	assert.Equal(t, "", cfg.DatabaseURL)
	assert.Equal(t, "8080", cfg.Port)
	assert.Equal(t, "", cfg.GinMode)
	// Outside release mode a dev fallback secret is used
	assert.NotEmpty(t, cfg.JWTSecret)
	assert.Equal(t, "http://localhost:5173", cfg.CORSOrigin)
}

func TestLoad_WithEnvironmentVariables(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://test:test@test-host:5432/testdb")
	os.Setenv("PORT", "9090")
	os.Setenv("GIN_MODE", "release")
	os.Setenv("JWT_SECRET", "super-secret")
	os.Setenv("CORS_ORIGIN", "https://divelog.example.com")

	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("PORT")
		os.Unsetenv("GIN_MODE")
		os.Unsetenv("JWT_SECRET")
		os.Unsetenv("CORS_ORIGIN")
	}()

	cfg, err := Load()

	assert.NoError(t, err)
	assert.Equal(t, "postgres://test:test@test-host:5432/testdb", cfg.DatabaseURL)
	assert.Equal(t, "9090", cfg.Port)
	assert.Equal(t, "release", cfg.GinMode)
	assert.Equal(t, "super-secret", cfg.JWTSecret)
	assert.Equal(t, "https://divelog.example.com", cfg.CORSOrigin)
}

func TestLoad_ReleaseModeRequiresJWTSecret(t *testing.T) {
	os.Setenv("GIN_MODE", "release")
	os.Unsetenv("JWT_SECRET")

	defer os.Unsetenv("GIN_MODE")

	_, err := Load()

	assert.Error(t, err)
}

func TestLoad_EmptyPortFallsBackToDefault(t *testing.T) {
	os.Setenv("PORT", "")

	defer os.Unsetenv("PORT")

	cfg, err := Load()

	assert.NoError(t, err)
	assert.Equal(t, "8080", cfg.Port)
}
