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

	cfg, err := Load()

	assert.NoError(t, err)
	assert.Equal(t, "", cfg.DatabaseURL)
	assert.Equal(t, "8080", cfg.Port)
	assert.Equal(t, "", cfg.GinMode)
}

func TestLoad_WithEnvironmentVariables(t *testing.T) {
	os.Setenv("DATABASE_URL", "postgres://test:test@test-host:5432/testdb")
	os.Setenv("PORT", "9090")
	os.Setenv("GIN_MODE", "release")

	defer func() {
		os.Unsetenv("DATABASE_URL")
		os.Unsetenv("PORT")
		os.Unsetenv("GIN_MODE")
	}()

	cfg, err := Load()

	assert.NoError(t, err)
	assert.Equal(t, "postgres://test:test@test-host:5432/testdb", cfg.DatabaseURL)
	assert.Equal(t, "9090", cfg.Port)
	assert.Equal(t, "release", cfg.GinMode)
}

func TestLoad_EmptyPortFallsBackToDefault(t *testing.T) {
	os.Setenv("PORT", "")

	defer os.Unsetenv("PORT")

	cfg, err := Load()

	assert.NoError(t, err)
	assert.Equal(t, "8080", cfg.Port)
}
