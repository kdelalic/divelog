package database

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestDefaultConnectionPoolConfig(t *testing.T) {
	t.Setenv("DB_MAX_OPEN_CONNS", "")
	t.Setenv("DB_MAX_IDLE_CONNS", "")
	t.Setenv("DB_CONN_MAX_LIFETIME_MINUTES", "")
	t.Setenv("DB_CONN_MAX_IDLE_MINUTES", "")

	configuration := getDefaultConfig()
	assert.Equal(t, 25, configuration.MaxOpenConns)
	assert.Equal(t, 5, configuration.MaxIdleConns)
	assert.Equal(t, 5*time.Minute, configuration.ConnMaxLifetime)
	assert.Equal(t, 5*time.Minute, configuration.ConnMaxIdleTime)
}

func TestConnectionPoolConfigFromEnvironment(t *testing.T) {
	t.Setenv("DB_MAX_OPEN_CONNS", "40")
	t.Setenv("DB_MAX_IDLE_CONNS", "10")
	t.Setenv("DB_CONN_MAX_LIFETIME_MINUTES", "15")
	t.Setenv("DB_CONN_MAX_IDLE_MINUTES", "3")

	configuration := getDefaultConfig()
	assert.Equal(t, 40, configuration.MaxOpenConns)
	assert.Equal(t, 10, configuration.MaxIdleConns)
	assert.Equal(t, 15*time.Minute, configuration.ConnMaxLifetime)
	assert.Equal(t, 3*time.Minute, configuration.ConnMaxIdleTime)
}

func TestGetEnvIntFallsBackForInvalidValue(t *testing.T) {
	t.Setenv("DIVELOG_TEST_INTEGER", "invalid")
	assert.Equal(t, 12, getEnvInt("DIVELOG_TEST_INTEGER", 12))
}

func TestHealthCheckWithoutDatabase(t *testing.T) {
	previous := DB
	DB = nil
	t.Cleanup(func() { DB = previous })
	assert.EqualError(t, HealthCheck(), "database connection is nil")
}
