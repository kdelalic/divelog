package main

import (
	"divelog-backend/database"
	"divelog-backend/handlers"
	"divelog-backend/middleware"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Warning: .env file not found: %v", err)
	}

	// Initialize database
	if err := database.InitDB(); err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer database.CloseDB()

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Gin router
	r := gin.Default()

	// Add request/response body logging middleware
	r.Use(middleware.RequestResponseLogger())

	// Add CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
			"service": "divelog-backend",
		})
	})

	// API routes
	api := r.Group("/api/v1")
	{
		// Settings endpoints
		api.GET("/settings", handlers.GetSettings)
		api.PUT("/settings", handlers.UpdateSettings)
		
		// Dive endpoints
		api.GET("/dives", handlers.GetDives)
		api.POST("/dives", handlers.CreateDive)
		api.POST("/dives/batch", handlers.CreateMultipleDives)
		api.PUT("/dives/:id", handlers.UpdateDive)
		api.DELETE("/dives/:id", handlers.DeleteDive)

		// Dive site endpoints
		api.GET("/dive-sites", handlers.GetDiveSites)
		api.GET("/dive-sites/search", handlers.SearchDiveSites)
		api.GET("/dive-sites/:id", handlers.GetDiveSite)
		api.POST("/dive-sites", handlers.CreateDiveSite)
		api.PUT("/dive-sites/:id", handlers.UpdateDiveSite)
		api.DELETE("/dive-sites/:id", handlers.DeleteDiveSite)
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}