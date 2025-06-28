package handlers

import (
	"divelog-backend/database"
	"divelog-backend/models"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// GetDives retrieves all dives for a user
func GetDives(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	db := database.DB
	
	// Query to get dives with location information
	query := `
		SELECT 
			d.id, d.user_id, d.dive_site_id, d.dive_date, d.max_depth, d.duration, 
			d.buddy, d.water_temperature, d.visibility, d.notes, d.created_at, d.updated_at,
			COALESCE(ds.latitude, d.latitude, 0.0) as latitude,
			COALESCE(ds.longitude, d.longitude, 0.0) as longitude,
			COALESCE(ds.name, d.location, 'Unknown Location') as location
		FROM dives d
		LEFT JOIN dive_sites ds ON d.dive_site_id = ds.id
		WHERE d.user_id = $1
		ORDER BY d.dive_date DESC, d.created_at DESC
	`

	rows, err := db.Query(query, userID)
	if err != nil {
		log.Printf("Error querying dives: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve dives"})
		return
	}
	defer rows.Close()

	var dives []models.Dive
	for rows.Next() {
		var dive models.Dive
		err := rows.Scan(
			&dive.ID, &dive.UserID, &dive.DiveSiteID, &dive.Date, &dive.MaxDepth, 
			&dive.Duration, &dive.Buddy, &dive.WaterTemp, &dive.Visibility, 
			&dive.Notes, &dive.CreatedAt, &dive.UpdatedAt,
			&dive.Latitude, &dive.Longitude, &dive.Location,
		)
		if err != nil {
			log.Printf("Error scanning dive: %v", err)
			continue
		}
		dives = append(dives, dive)
	}

	if err = rows.Err(); err != nil {
		log.Printf("Error iterating over dives: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve dives"})
		return
	}

	c.JSON(http.StatusOK, dives)
}

// CreateDive creates a new dive
func CreateDive(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	var diveReq models.DiveRequest
	if err := c.ShouldBindJSON(&diveReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dive := diveReq.ToDive(userID)
	db := database.DB

	// Insert the dive
	query := `
		INSERT INTO dives (user_id, dive_date, max_depth, duration, buddy, latitude, longitude, location, water_temperature, visibility, notes, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	err = db.QueryRow(
		query,
		dive.UserID, dive.Date, dive.MaxDepth, dive.Duration,
		dive.Buddy, dive.Latitude, dive.Longitude, dive.Location,
		dive.WaterTemp, dive.Visibility, dive.Notes,
		now, now,
	).Scan(&dive.ID, &dive.CreatedAt, &dive.UpdatedAt)

	if err != nil {
		log.Printf("Error creating dive: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create dive"})
		return
	}

	// Set the location and coordinates for response
	dive.Location = diveReq.Location
	dive.Latitude = diveReq.Lat
	dive.Longitude = diveReq.Lng

	c.JSON(http.StatusCreated, dive)
}

// CreateMultipleDives creates multiple dives in a batch (for imports)
func CreateMultipleDives(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	var diveReqs []models.DiveRequest
	if err := c.ShouldBindJSON(&diveReqs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(diveReqs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no dives provided"})
		return
	}

	db := database.DB
	tx, err := db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	var createdDives []models.Dive
	now := time.Now()

	for _, diveReq := range diveReqs {
		dive := diveReq.ToDive(userID)
		
		query := `
			INSERT INTO dives (user_id, dive_date, max_depth, duration, buddy, latitude, longitude, location, water_temperature, visibility, notes, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
			RETURNING id, created_at, updated_at
		`

		err = tx.QueryRow(
			query,
			dive.UserID, dive.Date, dive.MaxDepth, dive.Duration,
			dive.Buddy, dive.Latitude, dive.Longitude, dive.Location,
			dive.WaterTemp, dive.Visibility, dive.Notes,
			now, now,
		).Scan(&dive.ID, &dive.CreatedAt, &dive.UpdatedAt)

		if err != nil {
			log.Printf("Error creating dive in batch: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create dive in batch"})
			return
		}

		// Set the location and coordinates for response
		dive.Location = diveReq.Location
		dive.Latitude = diveReq.Lat
		dive.Longitude = diveReq.Lng

		createdDives = append(createdDives, *dive)
	}

	if err = tx.Commit(); err != nil {
		log.Printf("Error committing dive batch: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save dives"})
		return
	}

	c.JSON(http.StatusCreated, createdDives)
}

// UpdateDive updates an existing dive
func UpdateDive(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	diveIDStr := c.Param("id")
	diveID, err := strconv.Atoi(diveIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dive id"})
		return
	}

	var diveReq models.DiveRequest
	if err := c.ShouldBindJSON(&diveReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.DB

	// Update the dive
	query := `
		UPDATE dives 
		SET dive_date = $1, max_depth = $2, duration = $3, buddy = $4, 
		    water_temperature = $5, visibility = $6, notes = $7, updated_at = $8
		WHERE id = $9 AND user_id = $10
		RETURNING id, user_id, dive_date, max_depth, duration, buddy, 
		          water_temperature, visibility, notes, created_at, updated_at
	`

	var dive models.Dive
	now := time.Now()
	err = db.QueryRow(
		query,
		diveReq.Date, diveReq.Depth, diveReq.Duration, diveReq.Buddy,
		diveReq.WaterTemp, diveReq.Visibility, diveReq.Notes, now,
		diveID, userID,
	).Scan(
		&dive.ID, &dive.UserID, &dive.Date, &dive.MaxDepth, &dive.Duration,
		&dive.Buddy, &dive.WaterTemp, &dive.Visibility, &dive.Notes,
		&dive.CreatedAt, &dive.UpdatedAt,
	)

	if err != nil {
		log.Printf("Error updating dive: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update dive"})
		return
	}

	// Set the location and coordinates for response
	dive.Location = diveReq.Location
	dive.Latitude = diveReq.Lat
	dive.Longitude = diveReq.Lng

	c.JSON(http.StatusOK, dive)
}

// DeleteDive deletes a dive
func DeleteDive(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
		return
	}

	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user_id"})
		return
	}

	diveIDStr := c.Param("id")
	diveID, err := strconv.Atoi(diveIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dive id"})
		return
	}

	db := database.DB

	// Delete the dive
	query := `DELETE FROM dives WHERE id = $1 AND user_id = $2`
	result, err := db.Exec(query, diveID, userID)
	if err != nil {
		log.Printf("Error deleting dive: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dive"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dive"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dive not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dive deleted successfully"})
}