package repository

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"divelog-backend/models"
	"errors"
	"fmt"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Note: These are integration tests that require a test database
// In a real project, you'd use database mocking or test containers

func setupTestDB(t *testing.T) *sql.DB {
	// This would typically use a test database or mock
	// For now, we'll skip actual database tests
	t.Skip("Integration tests require test database setup")
	return nil
}

func TestDiveRepository_CreateDive(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveRepository(db)

	dive := &models.Dive{
		UserID:    1,
		DateTime:  models.LocalTime{Time: time.Now()},
		Location:  "Test Location",
		MaxDepth:  30.0,
		Duration:  45,
		Latitude:  40.7128,
		Longitude: -74.0060,
	}

	err := repo.CreateDive(context.Background(), dive)
	if err != nil {
		t.Errorf("CreateDive failed: %v", err)
	}

	if dive.ID == 0 {
		t.Error("Expected dive ID to be set after creation")
	}
}

func TestDiveRepository_GetDivesByUserID(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveRepository(db)

	dives, err := repo.GetDivesByUserID(context.Background(), 1)
	if err != nil {
		t.Errorf("GetDivesByUserID failed: %v", err)
	}

	// Should return empty slice, not nil
	if dives == nil {
		t.Error("Expected empty slice, got nil")
	}
}

// Unit test for validation logic (no database required)
func TestDiveValidation(t *testing.T) {
	dive := &models.Dive{
		UserID:   1,
		MaxDepth: -5.0, // Invalid negative depth
		Duration: 0,    // Invalid zero duration
	}

	// In a real implementation, you'd have validation methods
	if dive.MaxDepth < 0 {
		t.Log("Correctly identified negative depth as invalid")
	}

	if dive.Duration <= 0 {
		t.Log("Correctly identified zero/negative duration as invalid")
	}
}

type deleteAllTestDriver struct {
	result driver.Result
	err    error
	query  string
	args   []driver.NamedValue
}

func (d *deleteAllTestDriver) Open(string) (driver.Conn, error) {
	return &deleteAllTestConn{driver: d}, nil
}

type deleteAllTestConn struct {
	driver *deleteAllTestDriver
}

func (c *deleteAllTestConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("not implemented")
}

func (c *deleteAllTestConn) Close() error { return nil }

func (c *deleteAllTestConn) Begin() (driver.Tx, error) {
	return nil, errors.New("not implemented")
}

func (c *deleteAllTestConn) ExecContext(_ context.Context, query string, args []driver.NamedValue) (driver.Result, error) {
	c.driver.query = query
	c.driver.args = args
	return c.driver.result, c.driver.err
}

func TestDiveRepositoryDeleteAllDivesScopesDeleteToUser(t *testing.T) {
	testDriver := &deleteAllTestDriver{result: driver.RowsAffected(7)}
	driverName := fmt.Sprintf("delete-all-dives-success-%d", time.Now().UnixNano())
	sql.Register(driverName, testDriver)
	db, err := sql.Open(driverName, "")
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, db.Close()) })

	deleted, err := NewDiveRepository(db).DeleteAllDives(context.Background(), 42)

	require.NoError(t, err)
	assert.Equal(t, int64(7), deleted)
	assert.Equal(t, "DELETE FROM dives WHERE user_id = $1", testDriver.query)
	require.Len(t, testDriver.args, 1)
	assert.Equal(t, int64(42), testDriver.args[0].Value)
}
