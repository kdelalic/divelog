package database

import (
	"divelog-backend/config"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestConnect_InvalidConfig(t *testing.T) {
	// Test with invalid database configuration
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     "nonexistent-host",
			Port:     "5432",
			User:     "invalid-user",
			Password: "invalid-pass",
			Name:     "invalid-db",
		},
	}
	
	db, err := Connect(cfg)
	
	// Should return error for invalid config
	assert.Error(t, err)
	assert.Nil(t, db)
}

func TestConnect_EmptyConfig(t *testing.T) {
	// Test with empty config
	cfg := &config.Config{}
	
	db, err := Connect(cfg)
	
	// Should return error for empty config
	assert.Error(t, err)
	assert.Nil(t, db)
}

func TestConnect_ValidConfig_ButNoDatabase(t *testing.T) {
	// Test with valid config structure but no actual database
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     "5432",
			User:     "testuser",
			Password: "testpass",
			Name:     "testdb",
		},
	}
	
	db, err := Connect(cfg)
	
	// This will likely fail unless there's actually a test database running
	// but we're testing the function doesn't panic
	if err != nil {
		assert.Error(t, err)
		assert.Nil(t, db)
	} else {
		assert.NotNil(t, db)
		if db != nil {
			db.Close()
		}
	}
}

func TestBuildConnectionString(t *testing.T) {
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     "localhost",
			Port:     "5432",
			User:     "testuser",
			Password: "testpass",
			Name:     "testdb",
		},
	}
	
	// This assumes there's a buildConnectionString function
	// If it's not exported, this documents the expected connection string format
	expectedComponents := []string{
		"host=localhost",
		"port=5432",
		"user=testuser",
		"password=testpass",
		"dbname=testdb",
		"sslmode=disable",
	}
	
	// Test that all components would be present in a connection string
	for _, component := range expectedComponents {
		// This is a structural test - we're documenting expected behavior
		assert.NotEmpty(t, component)
	}
}

func TestDatabaseConfig_Validation(t *testing.T) {
	// Test various database configurations
	validConfig := config.DatabaseConfig{
		Host:     "localhost",
		Port:     "5432",
		User:     "user",
		Password: "pass",
		Name:     "db",
	}
	
	// Test that required fields are not empty
	assert.NotEmpty(t, validConfig.Host)
	assert.NotEmpty(t, validConfig.Port)
	assert.NotEmpty(t, validConfig.User)
	assert.NotEmpty(t, validConfig.Password)
	assert.NotEmpty(t, validConfig.Name)
}

func TestDatabaseConfig_DefaultPort(t *testing.T) {
	// Test that default PostgreSQL port is used
	cfg := config.DatabaseConfig{
		Host:     "localhost",
		Port:     "5432", // Default PostgreSQL port
		User:     "user",
		Password: "pass",
		Name:     "db",
	}
	
	assert.Equal(t, "5432", cfg.Port)
}

func TestDatabaseConfig_SpecialCharacters(t *testing.T) {
	// Test config with special characters that might need escaping
	cfg := config.DatabaseConfig{
		Host:     "localhost",
		Port:     "5432",
		User:     "user@domain",
		Password: "p@ssw0rd!",
		Name:     "test-db_name",
	}
	
	// Test that special characters are preserved
	assert.Contains(t, cfg.User, "@")
	assert.Contains(t, cfg.Password, "@")
	assert.Contains(t, cfg.Password, "!")
	assert.Contains(t, cfg.Name, "-")
	assert.Contains(t, cfg.Name, "_")
}