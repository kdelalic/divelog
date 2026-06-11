package database

import (
	"context"
	"database/sql"
	"divelog-backend/utils"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"time"

	_ "github.com/lib/pq"
)

var DB *sql.DB

// defaultDatabaseURL is used when DATABASE_URL is not set, matching the
// docker-compose default for local development.
const defaultDatabaseURL = "postgres://dev:devpass@localhost:5432/subsurface?sslmode=disable"

// ResolveDatabaseURL returns databaseURL, falling back to the local
// development default when it is empty.
func ResolveDatabaseURL(databaseURL string) string {
	if databaseURL == "" {
		return defaultDatabaseURL
	}
	return databaseURL
}

type Config struct {
	MaxOpenConns    int
	MaxIdleConns    int
	ConnMaxLifetime time.Duration
	ConnMaxIdleTime time.Duration
}

// InitDBWithConfig initializes the database connection with connection pooling
func InitDBWithConfig(cfg *Config) error {
	databaseURL := ResolveDatabaseURL(os.Getenv("DATABASE_URL"))

	var err error
	DB, err = sql.Open("postgres", databaseURL)
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}

	// Configure connection pool
	if cfg == nil {
		cfg = getDefaultConfig()
	}
	
	DB.SetMaxOpenConns(cfg.MaxOpenConns)
	DB.SetMaxIdleConns(cfg.MaxIdleConns)
	DB.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	DB.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	// Test the connection
	if err = DB.Ping(); err != nil {
		return fmt.Errorf("failed to ping database: %w", err)
	}

	utils.LogInfo(context.Background(), "Database connection established successfully", 
		slog.Int("max_open_conns", cfg.MaxOpenConns),
		slog.Int("max_idle_conns", cfg.MaxIdleConns))
	
	return nil
}

// InitDB initializes the database connection (backwards compatibility)
func InitDB() error {
	return InitDBWithConfig(nil)
}

// getDefaultConfig returns default connection pool configuration
func getDefaultConfig() *Config {
	return &Config{
		MaxOpenConns:    getEnvInt("DB_MAX_OPEN_CONNS", 25),
		MaxIdleConns:    getEnvInt("DB_MAX_IDLE_CONNS", 5),
		ConnMaxLifetime: time.Duration(getEnvInt("DB_CONN_MAX_LIFETIME_MINUTES", 5)) * time.Minute,
		ConnMaxIdleTime: time.Duration(getEnvInt("DB_CONN_MAX_IDLE_MINUTES", 5)) * time.Minute,
	}
}

// getEnvInt gets an environment variable as int with default fallback
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

// HealthCheck checks if the database is healthy
func HealthCheck() error {
	if DB == nil {
		return fmt.Errorf("database connection is nil")
	}
	
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	
	return DB.PingContext(ctx)
}

// CloseDB closes the database connection
func CloseDB() error {
	if DB != nil {
		return DB.Close()
	}
	return nil
}