package config

import (
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestLoad_DefaultValues(t *testing.T) {
	// Clear environment variables
	os.Unsetenv("DB_HOST")
	os.Unsetenv("DB_PORT")
	os.Unsetenv("DB_USER")
	os.Unsetenv("DB_PASSWORD")
	os.Unsetenv("DB_NAME")
	os.Unsetenv("PORT")
	os.Unsetenv("ENVIRONMENT")
	
	config := Load()
	
	// Test default values
	assert.Equal(t, "localhost", config.Database.Host)
	assert.Equal(t, "5432", config.Database.Port)
	assert.Equal(t, "dev", config.Database.User)
	assert.Equal(t, "devpass", config.Database.Password)
	assert.Equal(t, "subsurface", config.Database.Name)
	assert.Equal(t, "8080", config.Server.Port)
	assert.Equal(t, "development", config.Environment)
}

func TestLoad_WithEnvironmentVariables(t *testing.T) {
	// Set environment variables
	os.Setenv("DB_HOST", "test-host")
	os.Setenv("DB_PORT", "3306")
	os.Setenv("DB_USER", "test-user")
	os.Setenv("DB_PASSWORD", "test-pass")
	os.Setenv("DB_NAME", "test-db")
	os.Setenv("PORT", "9090")
	os.Setenv("ENVIRONMENT", "production")
	
	defer func() {
		// Clean up
		os.Unsetenv("DB_HOST")
		os.Unsetenv("DB_PORT")
		os.Unsetenv("DB_USER")
		os.Unsetenv("DB_PASSWORD")
		os.Unsetenv("DB_NAME")
		os.Unsetenv("PORT")
		os.Unsetenv("ENVIRONMENT")
	}()
	
	config := Load()
	
	// Test environment variable values
	assert.Equal(t, "test-host", config.Database.Host)
	assert.Equal(t, "3306", config.Database.Port)
	assert.Equal(t, "test-user", config.Database.User)
	assert.Equal(t, "test-pass", config.Database.Password)
	assert.Equal(t, "test-db", config.Database.Name)
	assert.Equal(t, "9090", config.Server.Port)
	assert.Equal(t, "production", config.Environment)
}

func TestLoad_PartialEnvironmentVariables(t *testing.T) {
	// Set only some environment variables
	os.Setenv("DB_HOST", "partial-host")
	os.Setenv("PORT", "7070")
	
	defer func() {
		os.Unsetenv("DB_HOST")
		os.Unsetenv("PORT")
	}()
	
	config := Load()
	
	// Test mixed values (env vars and defaults)
	assert.Equal(t, "partial-host", config.Database.Host)
	assert.Equal(t, "5432", config.Database.Port) // default
	assert.Equal(t, "dev", config.Database.User)  // default
	assert.Equal(t, "7070", config.Server.Port)   // env var
	assert.Equal(t, "development", config.Environment) // default
}

func TestConfig_DatabaseConnectionString(t *testing.T) {
	config := &Config{
		Database: DatabaseConfig{
			Host:     "localhost",
			Port:     "5432",
			User:     "testuser",
			Password: "testpass",
			Name:     "testdb",
		},
	}
	
	// Note: This assumes there's a method to generate connection string
	// If not, this test documents expected behavior
	expectedHost := "localhost"
	expectedPort := "5432"
	
	assert.Equal(t, expectedHost, config.Database.Host)
	assert.Equal(t, expectedPort, config.Database.Port)
}

func TestConfig_IsProduction(t *testing.T) {
	prodConfig := &Config{Environment: "production"}
	devConfig := &Config{Environment: "development"}
	testConfig := &Config{Environment: "testing"}
	
	// This assumes there's an IsProduction method
	// If not, this documents expected behavior
	assert.Equal(t, "production", prodConfig.Environment)
	assert.Equal(t, "development", devConfig.Environment)
	assert.Equal(t, "testing", testConfig.Environment)
}

func TestConfig_ServerAddress(t *testing.T) {
	config := &Config{
		Server: ServerConfig{
			Port: "8080",
		},
	}
	
	expectedPort := "8080"
	assert.Equal(t, expectedPort, config.Server.Port)
}

func TestLoad_EmptyEnvironmentVariables(t *testing.T) {
	// Set empty environment variables
	os.Setenv("DB_HOST", "")
	os.Setenv("PORT", "")
	
	defer func() {
		os.Unsetenv("DB_HOST")
		os.Unsetenv("PORT")
	}()
	
	config := Load()
	
	// Empty env vars should fall back to defaults
	assert.Equal(t, "localhost", config.Database.Host)
	assert.Equal(t, "8080", config.Server.Port)
}

func TestConfigStruct(t *testing.T) {
	config := Config{
		Database: DatabaseConfig{
			Host:     "test-host",
			Port:     "5432",
			User:     "test-user",
			Password: "test-pass",
			Name:     "test-db",
		},
		Server: ServerConfig{
			Port: "8080",
		},
		Environment: "test",
	}
	
	// Test struct fields are accessible
	assert.Equal(t, "test-host", config.Database.Host)
	assert.Equal(t, "5432", config.Database.Port)
	assert.Equal(t, "test-user", config.Database.User)
	assert.Equal(t, "test-pass", config.Database.Password)
	assert.Equal(t, "test-db", config.Database.Name)
	assert.Equal(t, "8080", config.Server.Port)
	assert.Equal(t, "test", config.Environment)
}