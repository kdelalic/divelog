package main

import (
	"context"
	"divelog-backend/config"
	"divelog-backend/database"
	"divelog-backend/handlers"
	"divelog-backend/middleware"
	"divelog-backend/repository"
	"divelog-backend/services"
	"divelog-backend/utils"
	"log"
	"log/slog"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Initialize structured logging
	utils.InitLogger(cfg.GinMode)

	// Initialize database with improved connection pooling
	if err := database.InitDBWithConfig(nil); err != nil {
		utils.LogError(nil, "Failed to initialize database", err)
		log.Fatal("Database initialization failed:", err)
	}
	defer database.CloseDB()
	if err := database.RunMigrations(context.Background(), database.DB); err != nil {
		utils.LogError(nil, "Failed to migrate database", err)
		log.Fatal("Database migration failed:", err)
	}

	// Set Gin mode
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create repositories
	diveRepo := repository.NewDiveRepository(database.DB)
	diveSiteRepo := repository.NewDiveSiteRepository(database.DB)
	settingsRepo := repository.NewSettingsRepository(database.DB)
	logbookRepo := repository.NewLogbookRepository(database.DB)
	transactor := repository.NewSQLTransactor(database.DB)

	// Create services and handlers
	diveService := services.NewDiveService(diveRepo, transactor)
	diveSiteService := services.NewDiveSiteService(diveSiteRepo, transactor)
	diveHandler := handlers.NewDiveHandler(diveService)
	diveSiteHandler := handlers.NewDiveSiteHandler(diveSiteService)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo)
	logbookHandler := handlers.NewLogbookHandler(services.NewLogbookService(logbookRepo))

	// Create Gin router
	r := gin.Default()

	// Add global middleware
	r.Use(middleware.RequestID())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.RequestSizeLimit(10 << 20)) // 10MB limit
	r.Use(middleware.RateLimit(100))             // 100 requests per minute
	r.Use(middleware.RequestResponseLogger())
	r.Use(middleware.CORS())

	// Health check endpoint with database check
	r.GET("/health", func(c *gin.Context) {
		dbHealth := "ok"
		if err := database.HealthCheck(); err != nil {
			dbHealth = "unhealthy"
			utils.LogError(c.Request.Context(), "Database health check failed", err,
				slog.String("request_id", c.GetString("request_id")))
		}

		response := gin.H{
			"status":   "ok",
			"service":  "divelog-backend",
			"database": dbHealth,
		}

		if dbHealth == "unhealthy" {
			c.JSON(503, response)
		} else {
			c.JSON(200, response)
		}
	})

	// API routes
	api := r.Group("/api/v1")
	{
		// Settings endpoints
		api.GET("/settings", settingsHandler.GetSettings)
		api.PUT("/settings", settingsHandler.UpdateSettings)

		// Dive endpoints with middleware
		diveRoutes := api.Group("/dives")
		diveRoutes.Use(middleware.UserIDMiddleware())
		{
			diveRoutes.GET("", diveHandler.GetDives)
			diveRoutes.POST("", diveHandler.CreateDive)
			diveRoutes.POST("/batch", diveHandler.CreateMultipleDives)
			diveRoutes.PUT("/:id", diveHandler.UpdateDive)
			diveRoutes.DELETE("/:id", diveHandler.DeleteDive)

			// Development-only helper for wiping test data. Deliberately not
			// registered in release mode, so it cannot be reached in production.
			if cfg.GinMode != "release" {
				diveRoutes.DELETE("", diveHandler.DeleteAllDives)
			}
		}

		organizationRoutes := api.Group("")
		organizationRoutes.Use(middleware.UserIDMiddleware())
		{
			organizationRoutes.GET("/tags", logbookHandler.GetTags)
			organizationRoutes.POST("/tags", logbookHandler.CreateTag)
			organizationRoutes.PUT("/tags/:id", logbookHandler.UpdateTag)
			organizationRoutes.DELETE("/tags/:id", logbookHandler.DeleteTag)
			organizationRoutes.GET("/trips", logbookHandler.GetTrips)
			organizationRoutes.POST("/trips", logbookHandler.CreateTrip)
			organizationRoutes.PUT("/trips/:id", logbookHandler.UpdateTrip)
			organizationRoutes.DELETE("/trips/:id", logbookHandler.DeleteTrip)
			organizationRoutes.POST("/trips/:id/merge", logbookHandler.MergeTrips)
			organizationRoutes.POST("/trips/:id/split", logbookHandler.SplitTrip)
			organizationRoutes.POST("/dives/renumber", logbookHandler.RenumberDives)
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
	utils.LogInfo(nil, "Server starting", slog.String("port", cfg.Port))
	if err := r.Run(":" + cfg.Port); err != nil {
		utils.LogError(nil, "Failed to start server", err)
		log.Fatal("Server startup failed:", err)
	}
}
