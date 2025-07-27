package handlers

import (
	"divelog-backend/database"
	"divelog-backend/models"
	"log"
	"math"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// FindOrCreateDiveSite finds an existing dive site or creates a new one
func FindOrCreateDiveSite(name string, latitude, longitude float64) (*models.DiveSite, error) {
	db := database.DB

	// Try to find an existing dive site with the same name and close coordinates
	var existingSite models.DiveSite
	query := `SELECT id, name, latitude, longitude, description, created_at, updated_at 
			  FROM dive_sites WHERE LOWER(name) = LOWER($1)`
	
	err := db.QueryRow(query, name).Scan(
		&existingSite.ID, &existingSite.Name, &existingSite.Latitude, 
		&existingSite.Longitude, &existingSite.Description,
		&existingSite.CreatedAt, &existingSite.UpdatedAt,
	)

	if err == nil {
		// Found existing site with same name
		// Check if coordinates are reasonably close (within ~100m)
		distance := calculateDistance(existingSite.Latitude, existingSite.Longitude, latitude, longitude)
		if distance < 0.1 { // Less than 100 meters
			return &existingSite, nil
		}
		// Name exists but coordinates are far - create new site (different location with same name)
	}

	// No matching site found, create a new one
	insertQuery := `INSERT INTO dive_sites (name, latitude, longitude, created_at, updated_at)
					VALUES ($1, $2, $3, NOW(), NOW())
					RETURNING id, name, latitude, longitude, description, created_at, updated_at`

	var newSite models.DiveSite
	err = db.QueryRow(insertQuery, name, latitude, longitude).Scan(
		&newSite.ID, &newSite.Name, &newSite.Latitude,
		&newSite.Longitude, &newSite.Description,
		&newSite.CreatedAt, &newSite.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &newSite, nil
}

// CheckDuplicateDive checks if a dive already exists for the same user, date, and dive site
func CheckDuplicateDive(userID int, diveSiteID int, diveDate string) (bool, error) {
	db := database.DB

	query := `SELECT COUNT(*) FROM dives 
			  WHERE user_id = $1 AND dive_site_id = $2 AND dive_date = $3`

	var count int
	err := db.QueryRow(query, userID, diveSiteID, diveDate).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// CheckDuplicateDiveForUpdate checks if a dive already exists excluding the current dive being updated
func CheckDuplicateDiveForUpdate(userID int, diveSiteID int, diveDate string, excludeDiveID int) (bool, error) {
	db := database.DB

	query := `SELECT COUNT(*) FROM dives 
			  WHERE user_id = $1 AND dive_site_id = $2 AND dive_date = $3 AND id != $4`

	var count int
	err := db.QueryRow(query, userID, diveSiteID, diveDate, excludeDiveID).Scan(&count)
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// calculateDistance calculates the distance between two coordinates in kilometers
func calculateDistance(lat1, lon1, lat2, lon2 float64) float64 {
	const R = 6371 // Earth's radius in kilometers

	dLat := (lat2 - lat1) * math.Pi / 180
	dLon := (lon2 - lon1) * math.Pi / 180

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*math.Pi/180)*math.Cos(lat2*math.Pi/180)*
			math.Sin(dLon/2)*math.Sin(dLon/2)

	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return R * c
}

// GetDiveSites returns all dive sites
func GetDiveSites(c *gin.Context) {
	db := database.DB

	query := `SELECT id, name, latitude, longitude, description, created_at, updated_at 
			  FROM dive_sites ORDER BY name`

	rows, err := db.Query(query)
	if err != nil {
		log.Printf("Error querying dive sites: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve dive sites"})
		return
	}
	defer rows.Close()

	var sites []models.DiveSite
	for rows.Next() {
		var site models.DiveSite
		err := rows.Scan(
			&site.ID, &site.Name, &site.Latitude, &site.Longitude,
			&site.Description, &site.CreatedAt, &site.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning dive site: %v", err)
			continue
		}
		sites = append(sites, site)
	}

	c.JSON(http.StatusOK, sites)
}

// SearchDiveSites searches for dive sites by name
func SearchDiveSites(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	db := database.DB

	searchQuery := `SELECT id, name, latitude, longitude, description, created_at, updated_at 
					FROM dive_sites 
					WHERE LOWER(name) LIKE LOWER($1) 
					ORDER BY name
					LIMIT 10`

	rows, err := db.Query(searchQuery, "%"+query+"%")
	if err != nil {
		log.Printf("Error searching dive sites: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search dive sites"})
		return
	}
	defer rows.Close()

	var sites []models.DiveSite
	for rows.Next() {
		var site models.DiveSite
		err := rows.Scan(
			&site.ID, &site.Name, &site.Latitude, &site.Longitude,
			&site.Description, &site.CreatedAt, &site.UpdatedAt,
		)
		if err != nil {
			log.Printf("Error scanning dive site: %v", err)
			continue
		}
		sites = append(sites, site)
	}

	c.JSON(http.StatusOK, sites)
}

// GetDiveSite returns a specific dive site
func GetDiveSite(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dive site id"})
		return
	}

	db := database.DB

	query := `SELECT id, name, latitude, longitude, description, created_at, updated_at 
			  FROM dive_sites WHERE id = $1`

	var site models.DiveSite
	err = db.QueryRow(query, id).Scan(
		&site.ID, &site.Name, &site.Latitude, &site.Longitude,
		&site.Description, &site.CreatedAt, &site.UpdatedAt,
	)

	if err != nil {
		log.Printf("Error getting dive site: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Dive site not found"})
		return
	}

	c.JSON(http.StatusOK, site)
}

// CreateDiveSite creates a new dive site
func CreateDiveSite(c *gin.Context) {
	var siteReq models.DiveSiteRequest
	if err := c.ShouldBindJSON(&siteReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if a dive site with the same name and close coordinates already exists
	existingSite, err := FindOrCreateDiveSite(siteReq.Name, siteReq.Latitude, siteReq.Longitude)
	if err != nil {
		log.Printf("Error checking for existing dive site: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create dive site"})
		return
	}

	// Check if this is actually a new site or an existing one
	distance := calculateDistance(existingSite.Latitude, existingSite.Longitude, siteReq.Latitude, siteReq.Longitude)
	if distance < 0.1 && existingSite.Name == siteReq.Name {
		// This is essentially the same site
		c.JSON(http.StatusConflict, gin.H{
			"error": "A dive site with this name and location already exists",
			"existing_site": existingSite,
		})
		return
	}

	// Create new site (FindOrCreateDiveSite already created it if it was new)
	c.JSON(http.StatusCreated, existingSite)
}

// UpdateDiveSite updates an existing dive site
func UpdateDiveSite(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dive site id"})
		return
	}

	var siteReq models.DiveSiteRequest
	if err := c.ShouldBindJSON(&siteReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db := database.DB

	// Check if another dive site with the same name and close coordinates exists (excluding current one)
	checkQuery := `SELECT id FROM dive_sites 
				   WHERE LOWER(name) = LOWER($1) AND id != $2`
	
	var existingID int
	err = db.QueryRow(checkQuery, siteReq.Name, id).Scan(&existingID)
	if err == nil {
		// Found another site with same name, check distance
		var existingLat, existingLng float64
		err = db.QueryRow(`SELECT latitude, longitude FROM dive_sites WHERE id = $1`, existingID).Scan(&existingLat, &existingLng)
		if err == nil {
			distance := calculateDistance(existingLat, existingLng, siteReq.Latitude, siteReq.Longitude)
			if distance < 0.1 {
				c.JSON(http.StatusConflict, gin.H{
					"error": "A dive site with this name and location already exists",
				})
				return
			}
		}
	}

	// Update the dive site
	updateQuery := `UPDATE dive_sites 
					SET name = $1, latitude = $2, longitude = $3, description = $4, updated_at = NOW()
					WHERE id = $5
					RETURNING id, name, latitude, longitude, description, created_at, updated_at`

	var site models.DiveSite
	err = db.QueryRow(updateQuery, siteReq.Name, siteReq.Latitude, siteReq.Longitude, siteReq.Description, id).Scan(
		&site.ID, &site.Name, &site.Latitude, &site.Longitude,
		&site.Description, &site.CreatedAt, &site.UpdatedAt,
	)

	if err != nil {
		log.Printf("Error updating dive site: %v", err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Dive site not found"})
		return
	}

	c.JSON(http.StatusOK, site)
}

// DeleteDiveSite deletes a dive site (only if no dives reference it)
func DeleteDiveSite(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.Atoi(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid dive site id"})
		return
	}

	db := database.DB

	// Check if any dives reference this dive site
	var diveCount int
	err = db.QueryRow(`SELECT COUNT(*) FROM dives WHERE dive_site_id = $1`, id).Scan(&diveCount)
	if err != nil {
		log.Printf("Error checking dive site usage: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check dive site usage"})
		return
	}

	if diveCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Cannot delete dive site that has associated dives",
			"dive_count": diveCount,
		})
		return
	}

	// Delete the dive site
	deleteQuery := `DELETE FROM dive_sites WHERE id = $1`
	result, err := db.Exec(deleteQuery, id)
	if err != nil {
		log.Printf("Error deleting dive site: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dive site"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Printf("Error getting rows affected: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dive site"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Dive site not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dive site deleted successfully"})
}