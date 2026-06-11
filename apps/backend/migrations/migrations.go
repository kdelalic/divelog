// Package migrations embeds the SQL migration files so they can be applied
// at application startup via golang-migrate.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
