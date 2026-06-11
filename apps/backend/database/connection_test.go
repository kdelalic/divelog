package database

import (
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestGetDefaultConfig(t *testing.T) {
	os.Unsetenv("DB_MAX_OPEN_CONNS")
	os.Unsetenv("DB_MAX_IDLE_CONNS")
	os.Unsetenv("DB_CONN_MAX_LIFETIME_MINUTES")
	os.Unsetenv("DB_CONN_MAX_IDLE_MINUTES")

	cfg := getDefaultConfig()

	assert.Equal(t, 25, cfg.MaxOpenConns)
	assert.Equal(t, 5, cfg.MaxIdleConns)
	assert.Equal(t, 5*time.Minute, cfg.ConnMaxLifetime)
	assert.Equal(t, 5*time.Minute, cfg.ConnMaxIdleTime)
}

func TestGetDefaultConfig_FromEnvironment(t *testing.T) {
	os.Setenv("DB_MAX_OPEN_CONNS", "50")
	os.Setenv("DB_MAX_IDLE_CONNS", "10")

	defer func() {
		os.Unsetenv("DB_MAX_OPEN_CONNS")
		os.Unsetenv("DB_MAX_IDLE_CONNS")
	}()

	cfg := getDefaultConfig()

	assert.Equal(t, 50, cfg.MaxOpenConns)
	assert.Equal(t, 10, cfg.MaxIdleConns)
}

func TestGetEnvInt_InvalidValue(t *testing.T) {
	os.Setenv("DB_MAX_OPEN_CONNS", "not_a_number")

	defer os.Unsetenv("DB_MAX_OPEN_CONNS")

	// Invalid values should fall back to the default
	assert.Equal(t, 25, getEnvInt("DB_MAX_OPEN_CONNS", 25))
}
