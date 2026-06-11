package main

import (
	"divelog-backend/config"
	"divelog-backend/database"
	"divelog-backend/handlers"
	"divelog-backend/middleware"
	"divelog-backend/repository"
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

	// Apply database schema migrations
	if err := database.RunMigrations(database.ResolveDatabaseURL(cfg.DatabaseURL)); err != nil {
		utils.LogError(nil, "Failed to run database migrations", err)
		log.Fatal("Database migration failed:", err)
	}

	// Initialize database with improved connection pooling
	if err := database.InitDBWithConfig(nil); err != nil {
		utils.LogError(nil, "Failed to initialize database", err)
		log.Fatal("Database initialization failed:", err)
	}
	defer database.CloseDB()

	// Seed the local development account outside of release mode
	if cfg.GinMode != "release" {
		if err := database.SeedDevUser(); err != nil {
			utils.LogError(nil, "Failed to seed development user", err)
			log.Fatal("Database seeding failed:", err)
		}
	}

	// Set Gin mode
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create repositories
	diveRepo := repository.NewDiveRepository(database.DB)
	diveSiteRepo := repository.NewDiveSiteRepository(database.DB)
	settingsRepo := repository.NewSettingsRepository(database.DB)
	userRepo := repository.NewUserRepository(database.DB)

	// Create handlers
	diveHandler := handlers.NewDiveHandler(diveRepo, diveSiteRepo)
	diveSiteHandler := handlers.NewDiveSiteHandler(diveSiteRepo)
	settingsHandler := handlers.NewSettingsHandler(settingsRepo)
	authHandler := handlers.NewAuthHandler(userRepo, cfg.JWTSecret, cfg.GinMode == "release")

	// Create Gin router
	r := gin.Default()

	// Add global middleware
	r.Use(middleware.RequestID())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.RequestSizeLimit(10 << 20)) // 10MB limit
	r.Use(middleware.RateLimit(100))             // 100 requests per minute
	r.Use(middleware.RequestResponseLogger())
	r.Use(middleware.CORS(cfg.CORSOrigin))

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
		// Auth endpoints (stricter rate limit to slow credential stuffing)
		authRoutes := api.Group("/auth")
		authRoutes.Use(middleware.RateLimit(10))
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/refresh", authHandler.Refresh)
			authRoutes.POST("/logout", authHandler.Logout)
			authRoutes.GET("/me", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Me)
		}

		// Settings endpoints (authenticated)
		settingsRoutes := api.Group("/settings")
		settingsRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			settingsRoutes.GET("", settingsHandler.GetSettings)
			settingsRoutes.PUT("", settingsHandler.UpdateSettings)
		}

		// Dive endpoints (authenticated)
		diveRoutes := api.Group("/dives")
		diveRoutes.Use(middleware.AuthMiddleware(cfg.JWTSecret))
		{
			diveRoutes.GET("", diveHandler.GetDives)
			diveRoutes.POST("", diveHandler.CreateDive)
			diveRoutes.POST("/batch", diveHandler.CreateMultipleDives)
			diveRoutes.PUT("/:id", diveHandler.UpdateDive)
			diveRoutes.DELETE("/:id", diveHandler.DeleteDive)
		}

		// Dive site endpoints (shared catalog: reads are public, writes require auth)
		diveSiteRoutes := api.Group("/dive-sites")
		{
			diveSiteRoutes.GET("", diveSiteHandler.GetDiveSites)
			diveSiteRoutes.GET("/search", diveSiteHandler.SearchDiveSites)
			diveSiteRoutes.GET("/:id", diveSiteHandler.GetDiveSite)
			diveSiteRoutes.POST("", middleware.AuthMiddleware(cfg.JWTSecret), diveSiteHandler.CreateDiveSite)
			diveSiteRoutes.PUT("/:id", middleware.AuthMiddleware(cfg.JWTSecret), diveSiteHandler.UpdateDiveSite)
			diveSiteRoutes.DELETE("/:id", middleware.AuthMiddleware(cfg.JWTSecret), diveSiteHandler.DeleteDiveSite)
		}
	}

	// Start server
	utils.LogInfo(nil, "Server starting", slog.String("port", cfg.Port))
	if err := r.Run(":" + cfg.Port); err != nil {
		utils.LogError(nil, "Failed to start server", err)
		log.Fatal("Server startup failed:", err)
	}
}
