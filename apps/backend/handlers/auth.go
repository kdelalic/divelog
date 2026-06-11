package handlers

import (
	"context"
	"divelog-backend/auth"
	"divelog-backend/models"
	"divelog-backend/utils"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

const refreshCookieName = "refresh_token"

// UserRepository defines the user persistence operations used by AuthHandler.
type UserRepository interface {
	CreateUser(ctx context.Context, email, username, passwordHash string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUserByID(ctx context.Context, id int) (*models.User, error)
	StoreRefreshToken(ctx context.Context, userID int, tokenHash string, expiresAt time.Time) error
	GetUserIDByRefreshToken(ctx context.Context, tokenHash string) (int, error)
	RevokeRefreshToken(ctx context.Context, tokenHash string) error
}

type AuthHandler struct {
	userRepo     UserRepository
	jwtSecret    string
	secureCookie bool
}

func NewAuthHandler(userRepo UserRepository, jwtSecret string, secureCookie bool) *AuthHandler {
	return &AuthHandler{
		userRepo:     userRepo,
		jwtSecret:    jwtSecret,
		secureCookie: secureCookie,
	}
}

// Register creates a new user account and signs them in
func (h *AuthHandler) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error hashing password", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	user, err := h.userRepo.CreateUser(c.Request.Context(), req.Email, req.Username, passwordHash)
	if err != nil {
		if err == utils.ErrUserAlreadyExists {
			c.JSON(http.StatusConflict, gin.H{"error": "An account with this email or username already exists"})
			return
		}
		utils.LogError(c.Request.Context(), "Error creating user", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	h.issueTokens(c, user, http.StatusCreated)
}

// Login authenticates a user with email and password
func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userRepo.GetUserByEmail(c.Request.Context(), req.Email)
	if err != nil {
		if err == utils.ErrUserNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
			return
		}
		utils.LogError(c.Request.Context(), "Error looking up user for login", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to sign in"})
		return
	}

	if user.PasswordHash == "" || !auth.CheckPassword(req.Password, user.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	h.issueTokens(c, user, http.StatusOK)
}

// Refresh exchanges a valid refresh token cookie for a new access token.
// The refresh token is rotated: the old one is revoked and a new one issued.
func (h *AuthHandler) Refresh(c *gin.Context) {
	rawToken, err := c.Cookie(refreshCookieName)
	if err != nil || rawToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "refresh token required"})
		return
	}

	tokenHash := auth.HashRefreshToken(rawToken)
	userID, err := h.userRepo.GetUserIDByRefreshToken(c.Request.Context(), tokenHash)
	if err != nil {
		if err == utils.ErrInvalidRefreshToken {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired refresh token"})
			return
		}
		utils.LogError(c.Request.Context(), "Error validating refresh token", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh session"})
		return
	}

	user, err := h.userRepo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error loading user for refresh", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh session"})
		return
	}

	if err := h.userRepo.RevokeRefreshToken(c.Request.Context(), tokenHash); err != nil {
		utils.LogError(c.Request.Context(), "Error revoking old refresh token", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh session"})
		return
	}

	h.issueTokens(c, user, http.StatusOK)
}

// Logout revokes the current refresh token and clears the cookie
func (h *AuthHandler) Logout(c *gin.Context) {
	rawToken, err := c.Cookie(refreshCookieName)
	if err == nil && rawToken != "" {
		tokenHash := auth.HashRefreshToken(rawToken)
		if err := h.userRepo.RevokeRefreshToken(c.Request.Context(), tokenHash); err != nil {
			utils.LogError(c.Request.Context(), "Error revoking refresh token on logout", err)
		}
	}

	h.clearRefreshCookie(c)
	c.JSON(http.StatusOK, gin.H{"message": "Signed out"})
}

// Me returns the currently authenticated user
func (h *AuthHandler) Me(c *gin.Context) {
	userIDValue, exists := c.Get("userID")
	userID, ok := userIDValue.(int)
	if !exists || !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "not authenticated"})
		return
	}

	user, err := h.userRepo.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		if err == utils.ErrUserNotFound {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "user no longer exists"})
			return
		}
		utils.LogError(c.Request.Context(), "Error loading current user", err, utils.UserID(userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load user"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// issueTokens generates an access token and a refresh token cookie for the user
func (h *AuthHandler) issueTokens(c *gin.Context, user *models.User, status int) {
	accessToken, err := auth.GenerateAccessToken(user.ID, h.jwtSecret)
	if err != nil {
		utils.LogError(c.Request.Context(), "Error generating access token", err, utils.UserID(user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	rawRefresh, refreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		utils.LogError(c.Request.Context(), "Error generating refresh token", err, utils.UserID(user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	expiresAt := time.Now().Add(auth.RefreshTokenTTL)
	if err := h.userRepo.StoreRefreshToken(c.Request.Context(), user.ID, refreshHash, expiresAt); err != nil {
		utils.LogError(c.Request.Context(), "Error storing refresh token", err, utils.UserID(user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create session"})
		return
	}

	h.setRefreshCookie(c, rawRefresh)
	c.JSON(status, models.AuthResponse{
		AccessToken: accessToken,
		User:        user,
	})
}

func (h *AuthHandler) setRefreshCookie(c *gin.Context, rawToken string) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(
		refreshCookieName,
		rawToken,
		int(auth.RefreshTokenTTL.Seconds()),
		"/api/v1/auth",
		"", // current domain
		h.secureCookie,
		true, // httpOnly
	)
}

func (h *AuthHandler) clearRefreshCookie(c *gin.Context) {
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(refreshCookieName, "", -1, "/api/v1/auth", "", h.secureCookie, true)
}
