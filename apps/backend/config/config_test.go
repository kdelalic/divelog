package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLoadDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	t.Setenv("PORT", "")
	t.Setenv("GIN_MODE", "")

	configuration, err := Load()
	require.NoError(t, err)
	assert.Empty(t, configuration.DatabaseURL)
	assert.Equal(t, "8080", configuration.Port)
	assert.Empty(t, configuration.GinMode)
}

func TestLoadEnvironmentValues(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://example.test/divelog")
	t.Setenv("PORT", "9090")
	t.Setenv("GIN_MODE", "release")

	configuration, err := Load()
	require.NoError(t, err)
	assert.Equal(t, "postgres://example.test/divelog", configuration.DatabaseURL)
	assert.Equal(t, "9090", configuration.Port)
	assert.Equal(t, "release", configuration.GinMode)
}

func TestGetEnvWithDefault(t *testing.T) {
	t.Setenv("DIVELOG_TEST_VALUE", "")
	assert.Equal(t, "fallback", getEnvWithDefault("DIVELOG_TEST_VALUE", "fallback"))

	t.Setenv("DIVELOG_TEST_VALUE", "configured")
	assert.Equal(t, "configured", getEnvWithDefault("DIVELOG_TEST_VALUE", "fallback"))
}
