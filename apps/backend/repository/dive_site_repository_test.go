package repository

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"divelog-backend/models"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
)

type diveSiteCreateTestDriver struct {
	existing bool
	queries  []string
	args     [][]driver.NamedValue
}

func (d *diveSiteCreateTestDriver) Open(string) (driver.Conn, error) {
	return &diveSiteCreateTestConn{driver: d}, nil
}

type diveSiteCreateTestConn struct {
	driver *diveSiteCreateTestDriver
}

func (c *diveSiteCreateTestConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("not implemented")
}

func (c *diveSiteCreateTestConn) Close() error { return nil }

func (c *diveSiteCreateTestConn) Begin() (driver.Tx, error) {
	return nil, errors.New("not implemented")
}

func (c *diveSiteCreateTestConn) QueryContext(_ context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	c.driver.queries = append(c.driver.queries, query)
	c.driver.args = append(c.driver.args, args)
	now := time.Date(2026, time.August, 8, 12, 0, 0, 0, time.UTC)
	columns := []string{"id", "name", "latitude", "longitude", "description", "created_at", "updated_at"}
	if strings.Contains(query, "WHERE LOWER(name)") {
		if !c.driver.existing {
			return &diveSiteCreateTestRows{columns: columns}, nil
		}
		description := "Existing description"
		return &diveSiteCreateTestRows{
			columns: columns,
			values:  [][]driver.Value{{int64(12), "Test Site", 36.61, -121.89, description, now, now}},
		}, nil
	}
	if strings.Contains(query, "INSERT INTO dive_sites") {
		return &diveSiteCreateTestRows{
			columns: columns,
			values:  [][]driver.Value{{int64(13), args[0].Value, args[1].Value, args[2].Value, args[3].Value, now, now}},
		}, nil
	}
	return nil, fmt.Errorf("unexpected query: %s", query)
}

type diveSiteCreateTestRows struct {
	columns []string
	values  [][]driver.Value
	index   int
}

func (r *diveSiteCreateTestRows) Columns() []string { return r.columns }
func (r *diveSiteCreateTestRows) Close() error      { return nil }
func (r *diveSiteCreateTestRows) Next(dest []driver.Value) error {
	if r.index >= len(r.values) {
		return io.EOF
	}
	copy(dest, r.values[r.index])
	r.index++
	return nil
}

func openDiveSiteCreateTestDB(t *testing.T, testDriver *diveSiteCreateTestDriver) *sql.DB {
	t.Helper()
	driverName := fmt.Sprintf("dive-site-create-%d", time.Now().UnixNano())
	sql.Register(driverName, testDriver)
	db, err := sql.Open(driverName, "")
	assert.NoError(t, err)
	t.Cleanup(func() { assert.NoError(t, db.Close()) })
	return db
}

func TestDiveSiteRepository_CreateDiveSite(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()

	// Test creating a new dive site
	site, err := repo.CreateDiveSite(ctx, "Test Site", 40.7128, -74.0060, nil)
	assert.NoError(t, err)
	assert.NotNil(t, site)
	assert.Equal(t, "Test Site", site.Name)
	assert.Equal(t, 40.7128, site.Latitude)
	assert.Equal(t, -74.0060, site.Longitude)
	assert.NotZero(t, site.ID)
}

func TestDiveSiteRepository_GetAll(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()

	sites, err := repo.GetAll(ctx)
	assert.NoError(t, err)
	assert.NotNil(t, sites)
	// Should return empty slice, not nil
	assert.IsType(t, []models.DiveSite{}, sites)
}

func TestDiveSiteRepository_Search(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()

	sites, err := repo.Search(ctx, "test")
	assert.NoError(t, err)
	assert.NotNil(t, sites)
	assert.IsType(t, []models.DiveSite{}, sites)
}

func TestDiveSiteRepository_GetByID(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()

	// Test getting non-existent site
	site, err := repo.GetByID(ctx, 999999)
	assert.Error(t, err)
	assert.Nil(t, site)
}

func TestDiveSiteRepository_CreateWithDescription(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	description := "A test dive site"
	siteReq := &models.DiveSiteRequest{
		Name:        "New Test Site",
		Latitude:    40.7500,
		Longitude:   -73.9857,
		Description: &description,
	}

	site, err := repo.CreateDiveSite(ctx, siteReq.Name, siteReq.Latitude, siteReq.Longitude, siteReq.Description)
	assert.NoError(t, err)
	assert.NotNil(t, site)
	assert.Equal(t, siteReq.Name, site.Name)
}

func TestDiveSiteRepositoryCreatePreservesDescription(t *testing.T) {
	testDriver := &diveSiteCreateTestDriver{}
	db := openDiveSiteCreateTestDB(t, testDriver)
	description := "Restored from backup"

	request := &models.DiveSiteRequest{
		Name:        "Test Site",
		Latitude:    36.61,
		Longitude:   -121.89,
		Description: &description,
	}
	site, err := NewDiveSiteRepository(db).CreateDiveSite(
		context.Background(), request.Name, request.Latitude, request.Longitude, request.Description,
	)

	assert.NoError(t, err)
	assert.Equal(t, description, *site.Description)
	assert.Len(t, testDriver.queries, 1)
	assert.Contains(t, testDriver.queries[0], "description")
	assert.Equal(t, description, testDriver.args[0][3].Value)
}

func TestDiveSiteRepositoryFindByNameReturnsCandidates(t *testing.T) {
	testDriver := &diveSiteCreateTestDriver{existing: true}
	db := openDiveSiteCreateTestDB(t, testDriver)

	sites, err := NewDiveSiteRepository(db).FindDiveSitesByName(context.Background(), "test site")

	assert.NoError(t, err)
	assert.Equal(t, 12, sites[0].ID)
	assert.Len(t, testDriver.queries, 1)
}

func TestDiveSiteRepository_Update(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()
	description := "Updated description"
	// Test updating non-existent site
	siteReq := &models.DiveSiteRequest{
		Name:        "Updated Site",
		Latitude:    40.7500,
		Longitude:   -73.9857,
		Description: &description,
	}

	site, err := repo.UpdateDiveSite(ctx, 999999, siteReq)
	assert.Error(t, err)
	assert.Nil(t, site)
}

func TestDiveSiteRepository_Delete(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()

	// Test deleting non-existent site
	err := repo.DeleteDiveSite(ctx, 999999)
	assert.Error(t, err)
}

func TestDiveSiteRepository_GetDiveSiteByDiveID(t *testing.T) {
	db := setupTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()

	repo := NewDiveSiteRepository(db)
	ctx := context.Background()

	// Test getting dive site for non-existent dive
	siteID, err := repo.GetDiveSiteByDiveID(ctx, 999999)
	assert.Error(t, err)
	assert.Nil(t, siteID)
}
