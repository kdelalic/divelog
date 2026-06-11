package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("correct horse battery staple")
	assert.NoError(t, err)
	assert.NotEmpty(t, hash)
	assert.NotEqual(t, "correct horse battery staple", hash)

	assert.True(t, CheckPassword("correct horse battery staple", hash))
	assert.False(t, CheckPassword("wrong password", hash))
	assert.False(t, CheckPassword("correct horse battery staple", "not-a-hash"))
}

func TestAccessTokenRoundTrip(t *testing.T) {
	secret := "test-secret"

	token, err := GenerateAccessToken(42, secret)
	assert.NoError(t, err)
	assert.NotEmpty(t, token)

	userID, err := ValidateAccessToken(token, secret)
	assert.NoError(t, err)
	assert.Equal(t, 42, userID)
}

func TestValidateAccessToken_WrongSecret(t *testing.T) {
	token, err := GenerateAccessToken(42, "secret-a")
	assert.NoError(t, err)

	_, err = ValidateAccessToken(token, "secret-b")
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestValidateAccessToken_Garbage(t *testing.T) {
	_, err := ValidateAccessToken("not.a.token", "secret")
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestValidateAccessToken_Expired(t *testing.T) {
	secret := "test-secret"
	claims := jwt.RegisteredClaims{
		Subject:   "42",
		IssuedAt:  jwt.NewNumericDate(time.Now().Add(-time.Hour)),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
		Issuer:    "divelog",
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
	assert.NoError(t, err)

	_, err = ValidateAccessToken(token, secret)
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestValidateAccessToken_WrongAlgorithm(t *testing.T) {
	// Token signed with "none" algorithm must be rejected
	claims := jwt.RegisteredClaims{
		Subject:   "42",
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}
	token, err := jwt.NewWithClaims(jwt.SigningMethodNone, claims).SignedString(jwt.UnsafeAllowNoneSignatureType)
	assert.NoError(t, err)

	_, err = ValidateAccessToken(token, "secret")
	assert.ErrorIs(t, err, ErrInvalidToken)
}

func TestGenerateRefreshToken(t *testing.T) {
	raw1, hash1, err := GenerateRefreshToken()
	assert.NoError(t, err)
	assert.Len(t, raw1, 64) // 32 bytes hex-encoded
	assert.Len(t, hash1, 64)
	assert.NotEqual(t, raw1, hash1)
	assert.Equal(t, hash1, HashRefreshToken(raw1))

	// Tokens must be unique
	raw2, _, err := GenerateRefreshToken()
	assert.NoError(t, err)
	assert.NotEqual(t, raw1, raw2)
}
