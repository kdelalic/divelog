package main

import (
	"divelog-backend/config"
	"divelog-backend/database"
	"divelog-backend/handlers"
	"divelog-backend/middleware"
	"divelog-backend/repository"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.CloseDB()

	// Set Gin mode
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create repositories
	diveRepo := repository.NewDiveRepository(database.DB)
	diveSiteRepo := repository.NewDiveSiteRepository(database.DB)

	// Create handlers
	diveHandler := handlers.NewDiveHandler(diveRepo, diveSiteRepo)
	diveSiteHandler := handlers.NewDiveSiteHandler(diveSiteRepo)

	// Create Gin router
	r := gin.Default()

	// Add global middleware
	r.Use(middleware.RequestResponseLogger())
	r.Use(middleware.CORS())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "divelog-backend",
		})
	})

	// API routes
	api := r.Group("/api/v1")
	{
		// Settings endpoints (keeping original for now)
		api.GET("/settings", handlers.GetSettings)
		api.PUT("/settings", handlers.UpdateSettings)

		// Dive endpoints with middleware
		diveRoutes := api.Group("/dives")
		diveRoutes.Use(middleware.UserIDMiddleware())
		{
			diveRoutes.GET("", diveHandler.GetDives)
			diveRoutes.POST("", diveHandler.CreateDive)
			diveRoutes.POST("/batch", diveHandler.CreateMultipleDives)
			diveRoutes.PUT("/:id", diveHandler.UpdateDive)
			diveRoutes.DELETE("/:id", diveHandler.DeleteDive)
		}

		// Dive site endpoints (no user validation needed for these)
		diveSiteRoutes := api.Group("/dive-sites")
		{
			diveSiteRoutes.GET("", diveSiteHandler.GetDiveSites)
			diveSiteRoutes.GET("/search", diveSiteHandler.SearchDiveSites)
			diveSiteRoutes.GET("/:id", diveSiteHandler.GetDiveSite)
			diveSiteRoutes.POST("", diveSiteHandler.CreateDiveSite)
			diveSiteRoutes.PUT("/:id", diveSiteHandler.UpdateDiveSite)
			diveSiteRoutes.DELETE("/:id", diveSiteHandler.DeleteDiveSite)
		}
	}

	// Start server
	log.Printf("Server starting on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
