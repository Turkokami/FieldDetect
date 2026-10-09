# Database migrations

Schema changes go through Prisma Migrate. The build runs `prisma migrate deploy`,
which applies only committed migrations that haven't run yet. It never drops data
on its own, and with no new migrations it does nothing.

## Changing the schema

1. Edit `prisma/schema.prisma`. Keep changes additive: no renames, drops, or type
   changes on existing columns.
2. Against a local or dev database (never production), run:
   ```bash
   npm run db:migrate -- --name <short_name>
   ```
3. Read the generated `prisma/migrations/<timestamp>_<short_name>/migration.sql`,
   then commit it together with the schema change.
4. Deploying applies it.

Don't use `prisma db push` against a shared database.

## One-time baseline (production)

`0_init` captures the schema as it was when `db push` was replaced. Production
already has those tables, so 0_init must be marked as applied, not run:

```bash
DATABASE_URL="<production direct URL>" ./scripts/baseline-prod-db.sh
```

The script backs up production with `pg_dump`, checks that production matches
`schema.prisma`, and then runs `prisma migrate resolve --applied 0_init`.

Any other database that was created with `db push` and still has data (a preview
or staging DB, for example) needs the same `migrate resolve --applied 0_init`.
An empty database just runs `migrate deploy`.
