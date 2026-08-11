package repository

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"divelog-backend/services"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type transactionTestDriver struct {
	options    driver.TxOptions
	committed  bool
	rolledBack bool
}

func (d *transactionTestDriver) Open(string) (driver.Conn, error) {
	return &transactionTestConn{driver: d}, nil
}

type transactionTestConn struct{ driver *transactionTestDriver }

func (c *transactionTestConn) Prepare(string) (driver.Stmt, error) {
	return nil, errors.New("not implemented")
}
func (c *transactionTestConn) Close() error { return nil }
func (c *transactionTestConn) Begin() (driver.Tx, error) {
	return c.BeginTx(context.Background(), driver.TxOptions{})
}
func (c *transactionTestConn) BeginTx(_ context.Context, options driver.TxOptions) (driver.Tx, error) {
	c.driver.options = options
	return &transactionTestTx{driver: c.driver}, nil
}

type transactionTestTx struct{ driver *transactionTestDriver }

func (t *transactionTestTx) Commit() error {
	t.driver.committed = true
	return nil
}
func (t *transactionTestTx) Rollback() error {
	t.driver.rolledBack = true
	return nil
}

func openTransactionTestDB(t *testing.T, testDriver *transactionTestDriver) *sql.DB {
	t.Helper()
	name := fmt.Sprintf("transaction-test-%d", time.Now().UnixNano())
	sql.Register(name, testDriver)
	db, err := sql.Open(name, "")
	require.NoError(t, err)
	t.Cleanup(func() { require.NoError(t, db.Close()) })
	return db
}

func TestSQLTransactorCommitsSerializableWorkflow(t *testing.T) {
	testDriver := new(transactionTestDriver)
	transactor := NewSQLTransactor(openTransactionTestDB(t, testDriver))

	err := transactor.WithinTransaction(context.Background(), func(services.DiveRepository, services.DiveSiteRepository) error {
		return nil
	})

	require.NoError(t, err)
	assert.Equal(t, driver.IsolationLevel(sql.LevelSerializable), testDriver.options.Isolation)
	assert.True(t, testDriver.committed)
	assert.False(t, testDriver.rolledBack)
}

func TestSQLTransactorRollsBackFailedWorkflow(t *testing.T) {
	testDriver := new(transactionTestDriver)
	transactor := NewSQLTransactor(openTransactionTestDB(t, testDriver))
	expected := errors.New("workflow failed")

	err := transactor.WithinTransaction(context.Background(), func(services.DiveRepository, services.DiveSiteRepository) error {
		return expected
	})

	assert.ErrorIs(t, err, expected)
	assert.False(t, testDriver.committed)
	assert.True(t, testDriver.rolledBack)
}
