package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	AccessTokenTTL  = 15 * time.Minute
	RefreshTokenTTL = 30 * 24 * time.Hour
	bcryptCost      = 12
)

var ErrInvalidToken = errors.New("invalid or expired token")

// HashPassword hashes a plaintext password with bcrypt.
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hash), nil
}

// CheckPassword compares a plaintext password against a bcrypt hash.
func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// GenerateAccessToken creates a signed JWT for the given user ID.
func GenerateAccessToken(userID int, secret string) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   fmt.Sprintf("%d", userID),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(AccessTokenTTL)),
		Issuer:    "divelog",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// ValidateAccessToken verifies a JWT and returns the user ID it was issued for.
func ValidateAccessToken(tokenString, secret string) (int, error) {
	token, err := jwt.ParseWithClaims(tokenString, &jwt.RegisteredClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return 0, ErrInvalidToken
	}

	claims, ok := token.Claims.(*jwt.RegisteredClaims)
	if !ok || claims.Subject == "" {
		return 0, ErrInvalidToken
	}

	var userID int
	if _, err := fmt.Sscanf(claims.Subject, "%d", &userID); err != nil {
		return 0, ErrInvalidToken
	}
	return userID, nil
}

// GenerateRefreshToken creates a cryptographically random refresh token.
// The raw token is sent to the client; only its hash is stored.
func GenerateRefreshToken() (raw string, hash string, err error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", "", fmt.Errorf("failed to generate refresh token: %w", err)
	}
	raw = hex.EncodeToString(bytes)
	return raw, HashRefreshToken(raw), nil
}

// HashRefreshToken returns the SHA-256 hex digest of a raw refresh token.
func HashRefreshToken(raw string) string {
	sum := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(sum[:])
}
