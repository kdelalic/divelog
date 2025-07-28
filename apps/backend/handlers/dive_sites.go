package handlers

import (
	"divelog-backend/models"
	"divelog-backend/repository"
	"divelog-backend/utils"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

type DiveSiteHandler struct {
	diveSiteRepo *repository.DiveSiteRepository
}

func NewDiveSiteHandler(diveSiteRepo *repository.DiveSiteRepository) *DiveSiteHandler {
	return &DiveSiteHandler{
		diveSiteRepo: diveSiteRepo,
	}
}

// GetDiveSites returns all dive sites
func (h *DiveSiteHandler) GetDiveSites(c *gin.Context) {
	sites, err := h.diveSiteRepo.GetAll()
	if err != nil {
		log.Printf("Error getting dive sites: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve dive sites"})
		return
	}

	c.JSON(http.StatusOK, sites)
}

// SearchDiveSites searches for dive sites by name
func (h *DiveSiteHandler) SearchDiveSites(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter 'q' is required"})
		return
	}

	sites, err := h.diveSiteRepo.Search(query)
	if err != nil {
		log.Printf("Error searching dive sites: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to search dive sites"})
		return
	}

	c.JSON(http.StatusOK, sites)
}

// GetDiveSite returns a specific dive site
func (h *DiveSiteHandler) GetDiveSite(c *gin.Context) {
	id, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}

	site, err := h.diveSiteRepo.GetByID(id)
	if err != nil {
		if err == utils.ErrDiveSiteNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Dive site not found"})
			return
		}
		log.Printf("Error getting dive site: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get dive site"})
		return
	}

	c.JSON(http.StatusOK, site)
}

// CreateDiveSite creates a new dive site
func (h *DiveSiteHandler) CreateDiveSite(c *gin.Context) {
	var siteReq models.DiveSiteRequest
	if err := c.ShouldBindJSON(&siteReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	site, err := h.diveSiteRepo.Create(&siteReq)
	if err != nil {
		if err == utils.ErrDuplicateDive { // Reusing error for similar concept
			c.JSON(http.StatusConflict, gin.H{
				"error":         "A dive site with this name and location already exists",
				"existing_site": site,
			})
			return
		}
		log.Printf("Error creating dive site: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create dive site"})
		return
	}

	c.JSON(http.StatusCreated, site)
}

// UpdateDiveSite updates an existing dive site
func (h *DiveSiteHandler) UpdateDiveSite(c *gin.Context) {
	id, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}

	var siteReq models.DiveSiteRequest
	if err := c.ShouldBindJSON(&siteReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	site, err := h.diveSiteRepo.Update(id, &siteReq)
	if err != nil {
		if err == utils.ErrDiveSiteNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Dive site not found"})
			return
		}
		if err == utils.ErrDuplicateDive {
			c.JSON(http.StatusConflict, gin.H{
				"error": "A dive site with this name and location already exists",
			})
			return
		}
		log.Printf("Error updating dive site: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update dive site"})
		return
	}

	c.JSON(http.StatusOK, site)
}

// DeleteDiveSite deletes a dive site (only if no dives reference it)
func (h *DiveSiteHandler) DeleteDiveSite(c *gin.Context) {
	id, err := utils.ValidateIDParam(c, "id")
	if err != nil {
		return
	}

	err = h.diveSiteRepo.Delete(id)
	if err != nil {
		if err == utils.ErrDiveSiteNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Dive site not found"})
			return
		}
		if err == utils.ErrProcessingFailed {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Cannot delete dive site that has associated dives",
			})
			return
		}
		log.Printf("Error deleting dive site: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete dive site"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Dive site deleted successfully"})
}
