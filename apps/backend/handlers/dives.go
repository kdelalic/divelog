package handlers

import (
	"divelog-backend/database"
	"divelog-backend/models"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// parseDateTime converts ISO 8601 string to time.Time
func parseDateTime(dateTimeStr string) time.Time {
	// Try parsing as full ISO 8601 timestamp first
	if t, err := time.Parse(time.RFC3339, dateTimeStr); err == nil {
		return t
	}
	
	// Fallback to date-only format (assume start of day)
	if t, err := time.Parse("2006-01-02", dateTimeStr); err == nil {
		return t
	}
	
	// Last resort: current time
	return time.Now()
}

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
			d.id, d.user_id, d.dive_site_id, d.dive_datetime, d.max_depth, d.duration, 
			d.buddy, d.water_temperature, d.visibility, d.notes, d.samples, d.equipment, d.created_at, d.updated_at,
			COALESCE(ds.latitude, d.latitude, 0.0) as latitude,
			COALESCE(ds.longitude, d.longitude, 0.0) as longitude,
			COALESCE(ds.name, d.location, 'Unknown Location') as location
		FROM dives d
		LEFT JOIN dive_sites ds ON d.dive_site_id = ds.id
		WHERE d.user_id = $1
		ORDER BY d.dive_datetime DESC, d.created_at DESC
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
		var samplesJSON []byte
		var equipmentJSON []byte
		err := rows.Scan(
			&dive.ID, &dive.UserID, &dive.DiveSiteID, &dive.DateTime, &dive.MaxDepth, 
			&dive.Duration, &dive.Buddy, &dive.WaterTemp, &dive.Visibility, 
			&dive.Notes, &samplesJSON, &equipmentJSON, &dive.CreatedAt, &dive.UpdatedAt,
			&dive.Latitude, &dive.Longitude, &dive.Location,
		)
		
		// Parse samples JSON if present
		if samplesJSON != nil {
			if err := json.Unmarshal(samplesJSON, &dive.Samples); err != nil {
				log.Printf("Error parsing samples JSON: %v", err)
				dive.Samples = []models.DiveSample{} // Default to empty array
			}
		}

		// Parse equipment JSON if present
		if equipmentJSON != nil {
			if err := json.Unmarshal(equipmentJSON, &dive.Equipment); err != nil {
				log.Printf("Error parsing equipment JSON: %v", err)
				dive.Equipment = nil // Default to nil
			}
		}
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

	// Find or create dive site
	diveSite, err := FindOrCreateDiveSite(diveReq.Location, diveReq.Lat, diveReq.Lng)
	if err != nil {
		log.Printf("Error finding/creating dive site: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process dive site"})
		return
	}

	// Set the dive site ID
	dive.DiveSiteID = &diveSite.ID

	// Check for duplicate dive
	isDuplicate, err := CheckDuplicateDive(userID, diveSite.ID, diveReq.DateTime)
	if err != nil {
		log.Printf("Error checking duplicate dive: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicate dive"})
		return
	}

	if isDuplicate {
		c.JSON(http.StatusConflict, gin.H{
			"error": "A dive already exists for this date and location",
			"details": map[string]interface{}{
				"date": diveReq.DateTime,
				"location": diveReq.Location,
			},
		})
		return
	}

	// Serialize samples to JSON
	var samplesJSON []byte
	if len(dive.Samples) > 0 {
		samplesJSON, err = json.Marshal(dive.Samples)
		if err != nil {
			log.Printf("Error marshaling samples: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process samples data"})
			return
		}
	}

	// Serialize equipment to JSON
	var equipmentJSON []byte
	if dive.Equipment != nil {
		equipmentJSON, err = json.Marshal(dive.Equipment)
		if err != nil {
			log.Printf("Error marshaling equipment: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process equipment data"})
			return
		}
	}

	// Insert the dive with dive site reference
	query := `
		INSERT INTO dives (user_id, dive_site_id, dive_datetime, max_depth, duration, buddy, latitude, longitude, location, water_temperature, visibility, notes, samples, equipment, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
		RETURNING id, created_at, updated_at
	`

	now := time.Now()
	err = db.QueryRow(
		query,
		dive.UserID, dive.DiveSiteID, dive.DateTime, dive.MaxDepth, dive.Duration,
		dive.Buddy, dive.Latitude, dive.Longitude, dive.Location,
		dive.WaterTemp, dive.Visibility, dive.Notes, samplesJSON, equipmentJSON,
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
	var skippedDives []map[string]interface{}
	now := time.Now()

	for _, diveReq := range diveReqs {
		dive := diveReq.ToDive(userID)
		
		// Find or create dive site
		diveSite, err := FindOrCreateDiveSite(diveReq.Location, diveReq.Lat, diveReq.Lng)
		if err != nil {
			log.Printf("Error finding/creating dive site in batch: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process dive site"})
			return
		}

		// Set the dive site ID
		dive.DiveSiteID = &diveSite.ID

		// Check for duplicate dive
		isDuplicate, err := CheckDuplicateDive(userID, diveSite.ID, diveReq.DateTime)
		if err != nil {
			log.Printf("Error checking duplicate dive in batch: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicate dive"})
			return
		}

		if isDuplicate {
			// Skip duplicate dive but continue with others
			skippedDives = append(skippedDives, map[string]interface{}{
				"date": diveReq.DateTime,
				"location": diveReq.Location,
				"reason": "duplicate",
			})
			continue
		}
		
		// Serialize samples to JSON
		var samplesJSON []byte
		if len(dive.Samples) > 0 {
			samplesJSON, err = json.Marshal(dive.Samples)
			if err != nil {
				log.Printf("Error marshaling samples in batch: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process samples data"})
				return
			}
		}

		// Serialize equipment to JSON
		var equipmentJSON []byte
		if dive.Equipment != nil {
			equipmentJSON, err = json.Marshal(dive.Equipment)
			if err != nil {
				log.Printf("Error marshaling equipment in batch: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process equipment data"})
				return
			}
		}

		query := `
			INSERT INTO dives (user_id, dive_site_id, dive_datetime, max_depth, duration, buddy, latitude, longitude, location, water_temperature, visibility, notes, samples, equipment, created_at, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
			RETURNING id, created_at, updated_at
		`

		// For JSONB columns, we can pass nil for empty JSON or the JSON bytes
		var samplesParam interface{} = nil
		if len(samplesJSON) > 0 {
			samplesParam = samplesJSON
		}
		
		var equipmentParam interface{} = nil
		if len(equipmentJSON) > 0 {
			equipmentParam = equipmentJSON
		}

		err = tx.QueryRow(
			query,
			dive.UserID, dive.DiveSiteID, dive.DateTime, dive.MaxDepth, dive.Duration,
			dive.Buddy, dive.Latitude, dive.Longitude, dive.Location,
			dive.WaterTemp, dive.Visibility, dive.Notes, samplesParam, equipmentParam,
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

	// Return response with created dives and skipped information
	response := map[string]interface{}{
		"created": createdDives,
		"created_count": len(createdDives),
	}

	if len(skippedDives) > 0 {
		response["skipped"] = skippedDives
		response["skipped_count"] = len(skippedDives)
	}

	c.JSON(http.StatusCreated, response)
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

	log.Printf("UpdateDive: Starting update for dive ID %d, user ID %d", diveID, userID)
	log.Printf("UpdateDive: Request data - DateTime: %s, Location: %s, Lat: %f, Lng: %f", 
		diveReq.DateTime, diveReq.Location, diveReq.Lat, diveReq.Lng)
	log.Printf("UpdateDive: Has equipment: %t", diveReq.Equipment != nil)

	db := database.DB

	// Get the current dive to compare if location/date changed
	var currentDive models.Dive
	currentQuery := `SELECT dive_datetime, latitude, longitude, location FROM dives WHERE id = $1 AND user_id = $2`
	err = db.QueryRow(currentQuery, diveID, userID).Scan(
		&currentDive.DateTime, &currentDive.Latitude, &currentDive.Longitude, &currentDive.Location,
	)
	if err != nil {
		log.Printf("UpdateDive: Error getting current dive for update: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Dive not found"})
		return
	}

	log.Printf("UpdateDive: Current dive - DateTime: %s, Location: %s, Lat: %f, Lng: %f", 
		currentDive.DateTime.Format(time.RFC3339), currentDive.Location, currentDive.Latitude, currentDive.Longitude)

	// Parse the new datetime for comparison
	newDateTime := parseDateTime(diveReq.DateTime)
	
	// Only check for duplicates if location or date actually changed
	locationChanged := currentDive.Latitude != diveReq.Lat || currentDive.Longitude != diveReq.Lng
	dateChanged := currentDive.DateTime.Format("2006-01-02") != newDateTime.Format("2006-01-02")
	
	log.Printf("UpdateDive: Location changed: %t (current: %f,%f vs new: %f,%f)", 
		locationChanged, currentDive.Latitude, currentDive.Longitude, diveReq.Lat, diveReq.Lng)
	log.Printf("UpdateDive: Date changed: %t (current: %s vs new: %s)", 
		dateChanged, currentDive.DateTime.Format("2006-01-02"), newDateTime.Format("2006-01-02"))
	
	var diveSite *models.DiveSite
	if locationChanged || dateChanged {
		log.Printf("UpdateDive: Location or date changed - running duplicate check")
		// Find or create dive site for the updated dive
		diveSite, err = FindOrCreateDiveSite(diveReq.Location, diveReq.Lat, diveReq.Lng)
		if err != nil {
			log.Printf("UpdateDive: Error finding/creating dive site for update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process dive site"})
			return
		}

		// Check for duplicate dive (excluding current dive)
		isDuplicate, err := CheckDuplicateDiveForUpdateByLocation(userID, diveReq.Lat, diveReq.Lng, diveReq.DateTime, diveID)
		if err != nil {
			log.Printf("UpdateDive: Error checking duplicate dive for update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check for duplicate dive"})
			return
		}

		log.Printf("UpdateDive: Duplicate check result: %t", isDuplicate)
		if isDuplicate {
			log.Printf("UpdateDive: Returning 409 - duplicate dive found")
			c.JSON(http.StatusConflict, gin.H{
				"error": "A dive already exists for this date and location",
				"details": map[string]interface{}{
					"date": diveReq.DateTime,
					"location": diveReq.Location,
				},
			})
			return
		}
	} else {
		log.Printf("UpdateDive: No location/date changes - skipping duplicate check")
		// Location and date haven't changed, find existing dive site
		var diveSiteID *int
		if err := db.QueryRow(`SELECT dive_site_id FROM dives WHERE id = $1`, diveID).Scan(&diveSiteID); err != nil {
			log.Printf("UpdateDive: Error getting dive site ID: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get dive site"})
			return
		}
		
		log.Printf("UpdateDive: Current dive site ID: %v", diveSiteID)
		
		if diveSiteID != nil {
			var existingSite models.DiveSite
			siteQuery := `SELECT id, name, latitude, longitude, description, created_at, updated_at FROM dive_sites WHERE id = $1`
			err = db.QueryRow(siteQuery, *diveSiteID).Scan(
				&existingSite.ID, &existingSite.Name, &existingSite.Latitude, 
				&existingSite.Longitude, &existingSite.Description,
				&existingSite.CreatedAt, &existingSite.UpdatedAt,
			)
			if err == nil {
				diveSite = &existingSite
				log.Printf("UpdateDive: Found existing dive site: %s (ID: %d)", existingSite.Name, existingSite.ID)
			} else {
				log.Printf("UpdateDive: Error loading existing dive site: %v", err)
			}
		}
		
		// If we couldn't find the existing dive site, create one
		if diveSite == nil {
			log.Printf("UpdateDive: Creating new dive site for equipment-only update")
			diveSite, err = FindOrCreateDiveSite(diveReq.Location, diveReq.Lat, diveReq.Lng)
			if err != nil {
				log.Printf("UpdateDive: Error finding/creating dive site for update: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process dive site"})
				return
			}
		}
	}
	
	log.Printf("UpdateDive: Using dive site ID: %d for update", diveSite.ID)

	// Serialize samples to JSON
	var samplesJSON []byte
	if len(diveReq.Samples) > 0 {
		samplesJSON, err = json.Marshal(diveReq.Samples)
		if err != nil {
			log.Printf("Error marshaling samples for update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process samples data"})
			return
		}
	}

	// Serialize equipment to JSON
	var equipmentJSON []byte
	if diveReq.Equipment != nil {
		log.Printf("UpdateDive: Equipment data to marshal: %+v", diveReq.Equipment)
		equipmentJSON, err = json.Marshal(diveReq.Equipment)
		if err != nil {
			log.Printf("UpdateDive: Error marshaling equipment for update: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process equipment data"})
			return
		}
		log.Printf("UpdateDive: Equipment JSON: %s", string(equipmentJSON))
	} else {
		log.Printf("UpdateDive: No equipment data to marshal")
	}

	// Update the dive
	query := `
		UPDATE dives 
		SET dive_site_id = $1, dive_datetime = $2, max_depth = $3, duration = $4, buddy = $5, 
		    latitude = $6, longitude = $7, location = $8, water_temperature = $9, visibility = $10, notes = $11, samples = $12, equipment = $13, updated_at = $14
		WHERE id = $15 AND user_id = $16
		RETURNING id, user_id, dive_datetime, max_depth, duration, buddy, 
		          water_temperature, visibility, notes, samples, equipment, created_at, updated_at
	`

	log.Printf("UpdateDive: Executing update query with parameters:")
	log.Printf("  dive_site_id: %d", diveSite.ID)
	log.Printf("  dive_datetime: %v", parseDateTime(diveReq.DateTime))
	log.Printf("  samples JSON length: %d", len(samplesJSON))
	log.Printf("  equipment JSON length: %d", len(equipmentJSON))
	log.Printf("  equipment JSON content: %s", string(equipmentJSON))

	var dive models.Dive
	var samplesJSONOut []byte
	var equipmentJSONOut []byte
	now := time.Now()
	// For JSONB columns, we can pass nil for empty JSON or the JSON bytes
	var samplesParam interface{} = nil
	if len(samplesJSON) > 0 {
		samplesParam = samplesJSON
	}
	
	var equipmentParam interface{} = nil
	if len(equipmentJSON) > 0 {
		equipmentParam = equipmentJSON
	}
	
	log.Printf("UpdateDive: Using samplesParam: %v, equipmentParam: %v", samplesParam != nil, equipmentParam != nil)

	err = db.QueryRow(
		query,
		diveSite.ID, parseDateTime(diveReq.DateTime), diveReq.Depth, diveReq.Duration, diveReq.Buddy,
		diveReq.Lat, diveReq.Lng, diveReq.Location, diveReq.WaterTemp, diveReq.Visibility, diveReq.Notes, samplesParam, equipmentParam, now,
		diveID, userID,
	).Scan(
		&dive.ID, &dive.UserID, &dive.DateTime, &dive.MaxDepth, &dive.Duration,
		&dive.Buddy, &dive.WaterTemp, &dive.Visibility, &dive.Notes, &samplesJSONOut, &equipmentJSONOut,
		&dive.CreatedAt, &dive.UpdatedAt,
	)
	
	// Parse samples JSON if present
	if samplesJSONOut != nil {
		if err := json.Unmarshal(samplesJSONOut, &dive.Samples); err != nil {
			log.Printf("Error parsing samples JSON: %v", err)
			dive.Samples = []models.DiveSample{} // Default to empty array
		}
	}

	// Parse equipment JSON if present
	if equipmentJSONOut != nil {
		if err := json.Unmarshal(equipmentJSONOut, &dive.Equipment); err != nil {
			log.Printf("Error parsing equipment JSON: %v", err)
			dive.Equipment = nil // Default to nil
		}
	}

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