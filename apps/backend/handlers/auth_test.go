package handlers

import (
	"context"
	"divelog-backend/auth"
	"divelog-backend/models"
	"divelog-backend/utils"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockUserRepository for auth handler testing
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) CreateUser(ctx context.Context, email, username, passwordHash string) (*models.User, error) {
	args := m.Called(ctx, email, username, passwordHash)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) GetUserByEmail(ctx context.Context, email string) (*models.User, error) {
	args := m.Called(ctx, email)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) GetUserByID(ctx context.Context, id int) (*models.User, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(*models.User), args.Error(1)
}

func (m *MockUserRepository) StoreRefreshToken(ctx context.Context, userID int, tokenHash string, expiresAt time.Time) error {
	args := m.Called(ctx, userID, tokenHash, expiresAt)
	return args.Error(0)
}

func (m *MockUserRepository) GetUserIDByRefreshToken(ctx context.Context, tokenHash string) (int, error) {
	args := m.Called(ctx, tokenHash)
	return args.Int(0), args.Error(1)
}

func (m *MockUserRepository) RevokeRefreshToken(ctx context.Context, tokenHash string) error {
	args := m.Called(ctx, tokenHash)
	return args.Error(0)
}

const testSecret = "test-jwt-secret"

func setupAuthHandler() (*AuthHandler, *MockUserRepository) {
	mockRepo := new(MockUserRepository)
	handler := NewAuthHandler(mockRepo, testSecret, false)
	return handler, mockRepo
}

func TestAuthHandler_Register(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	user := &models.User{ID: 1, Email: "new@example.com", Username: "newuser"}
	mockRepo.On("CreateUser", mock.Anything, "new@example.com", "newuser", mock.AnythingOfType("string")).Return(user, nil)
	mockRepo.On("StoreRefreshToken", mock.Anything, 1, mock.AnythingOfType("string"), mock.AnythingOfType("time.Time")).Return(nil)

	c, w := setupGinContext("POST", "/auth/register", models.RegisterRequest{
		Email:    "new@example.com",
		Username: "newuser",
		Password: "password123",
	})

	handler.Register(c)

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp models.AuthResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp.AccessToken)
	assert.Equal(t, "new@example.com", resp.User.Email)

	// Access token must be valid for the new user
	userID, err := auth.ValidateAccessToken(resp.AccessToken, testSecret)
	assert.NoError(t, err)
	assert.Equal(t, 1, userID)

	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Register_DuplicateEmail(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	mockRepo.On("CreateUser", mock.Anything, "taken@example.com", "newuser", mock.AnythingOfType("string")).
		Return((*models.User)(nil), utils.ErrUserAlreadyExists)

	c, w := setupGinContext("POST", "/auth/register", models.RegisterRequest{
		Email:    "taken@example.com",
		Username: "newuser",
		Password: "password123",
	})

	handler.Register(c)

	assert.Equal(t, http.StatusConflict, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Register_WeakPassword(t *testing.T) {
	handler, _ := setupAuthHandler()

	c, w := setupGinContext("POST", "/auth/register", models.RegisterRequest{
		Email:    "new@example.com",
		Username: "newuser",
		Password: "short",
	})

	handler.Register(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAuthHandler_Login(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	hash, err := auth.HashPassword("password123")
	assert.NoError(t, err)
	user := &models.User{ID: 1, Email: "user@example.com", Username: "user", PasswordHash: hash}

	mockRepo.On("GetUserByEmail", mock.Anything, "user@example.com").Return(user, nil)
	mockRepo.On("StoreRefreshToken", mock.Anything, 1, mock.AnythingOfType("string"), mock.AnythingOfType("time.Time")).Return(nil)

	c, w := setupGinContext("POST", "/auth/login", models.LoginRequest{
		Email:    "user@example.com",
		Password: "password123",
	})

	handler.Login(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AuthResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp.AccessToken)

	// Refresh token cookie must be set
	cookies := w.Result().Cookies()
	var foundRefresh bool
	for _, cookie := range cookies {
		if cookie.Name == "refresh_token" {
			foundRefresh = true
			assert.True(t, cookie.HttpOnly)
			assert.NotEmpty(t, cookie.Value)
		}
	}
	assert.True(t, foundRefresh, "refresh_token cookie should be set")

	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Login_WrongPassword(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	hash, err := auth.HashPassword("password123")
	assert.NoError(t, err)
	user := &models.User{ID: 1, Email: "user@example.com", Username: "user", PasswordHash: hash}

	mockRepo.On("GetUserByEmail", mock.Anything, "user@example.com").Return(user, nil)

	c, w := setupGinContext("POST", "/auth/login", models.LoginRequest{
		Email:    "user@example.com",
		Password: "wrong-password",
	})

	handler.Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Login_UnknownUser(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	mockRepo.On("GetUserByEmail", mock.Anything, "nobody@example.com").
		Return((*models.User)(nil), utils.ErrUserNotFound)

	c, w := setupGinContext("POST", "/auth/login", models.LoginRequest{
		Email:    "nobody@example.com",
		Password: "password123",
	})

	handler.Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Login_PasswordlessUser(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	// User created before auth existed has no password hash; login must fail
	user := &models.User{ID: 1, Email: "legacy@example.com", Username: "legacy", PasswordHash: ""}
	mockRepo.On("GetUserByEmail", mock.Anything, "legacy@example.com").Return(user, nil)

	c, w := setupGinContext("POST", "/auth/login", models.LoginRequest{
		Email:    "legacy@example.com",
		Password: "anything12",
	})

	handler.Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Refresh(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	rawToken, tokenHash, err := auth.GenerateRefreshToken()
	assert.NoError(t, err)

	user := &models.User{ID: 1, Email: "user@example.com", Username: "user"}
	mockRepo.On("GetUserIDByRefreshToken", mock.Anything, tokenHash).Return(1, nil)
	mockRepo.On("GetUserByID", mock.Anything, 1).Return(user, nil)
	mockRepo.On("RevokeRefreshToken", mock.Anything, tokenHash).Return(nil)
	mockRepo.On("StoreRefreshToken", mock.Anything, 1, mock.AnythingOfType("string"), mock.AnythingOfType("time.Time")).Return(nil)

	c, w := setupGinContext("POST", "/auth/refresh", nil)
	c.Request.AddCookie(&http.Cookie{Name: "refresh_token", Value: rawToken})

	handler.Refresh(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.AuthResponse
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp.AccessToken)

	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Refresh_NoCookie(t *testing.T) {
	handler, _ := setupAuthHandler()

	c, w := setupGinContext("POST", "/auth/refresh", nil)

	handler.Refresh(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

func TestAuthHandler_Refresh_InvalidToken(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	mockRepo.On("GetUserIDByRefreshToken", mock.Anything, mock.AnythingOfType("string")).
		Return(0, utils.ErrInvalidRefreshToken)

	c, w := setupGinContext("POST", "/auth/refresh", nil)
	c.Request.AddCookie(&http.Cookie{Name: "refresh_token", Value: "stolen-or-expired"})

	handler.Refresh(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Logout(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	rawToken, tokenHash, err := auth.GenerateRefreshToken()
	assert.NoError(t, err)

	mockRepo.On("RevokeRefreshToken", mock.Anything, tokenHash).Return(nil)

	c, w := setupGinContext("POST", "/auth/logout", nil)
	c.Request.AddCookie(&http.Cookie{Name: "refresh_token", Value: rawToken})

	handler.Logout(c)

	assert.Equal(t, http.StatusOK, w.Code)
	mockRepo.AssertExpectations(t)
}

func TestAuthHandler_Me(t *testing.T) {
	handler, mockRepo := setupAuthHandler()

	user := &models.User{ID: 1, Email: "user@example.com", Username: "user"}
	mockRepo.On("GetUserByID", mock.Anything, 1).Return(user, nil)

	c, w := setupGinContext("GET", "/auth/me", nil)

	handler.Me(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp models.User
	assert.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "user@example.com", resp.Email)

	mockRepo.AssertExpectations(t)
}
