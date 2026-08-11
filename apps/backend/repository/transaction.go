package repository

import (
	"context"
	"database/sql"
	"divelog-backend/services"
	"divelog-backend/utils"
)

// dbExecutor is implemented by both sql.DB and sql.Tx.
type dbExecutor interface {
	Exec(string, ...interface{}) (sql.Result, error)
	ExecContext(context.Context, string, ...interface{}) (sql.Result, error)
	Query(string, ...interface{}) (*sql.Rows, error)
	QueryRow(string, ...interface{}) *sql.Row
}

// SQLTransactor creates transaction-bound repository instances for a service
// workflow. Serializable isolation makes each multi-repository write behave as
// one atomic decision, including its duplicate checks.
type SQLTransactor struct {
	db *sql.DB
}

func NewSQLTransactor(db *sql.DB) *SQLTransactor {
	return &SQLTransactor{db: db}
}

func (t *SQLTransactor) WithinTransaction(
	ctx context.Context,
	operation func(services.DiveRepository, services.DiveSiteRepository) error,
) error {
	tx, err := t.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return utils.ErrDatabaseError
	}

	committed := false
	defer func() {
		if !committed {
			_ = tx.Rollback()
		}
	}()

	if err := operation(newDiveRepository(tx), newDiveSiteRepository(tx)); err != nil {
		return err
	}
	if err := tx.Commit(); err != nil {
		return utils.ErrDatabaseError
	}
	committed = true
	return nil
}
