#!/usr/bin/env bash
# Build step: apply pending Prisma migrations.
#
# A database created with `prisma db push` (production before Phase 0) has tables
# but no migration history, so `migrate deploy` stops with P3005. In that case,
# and only if the database matches prisma/schema.prisma exactly, mark the
# baseline migration 0_init as applied (records history only; no data or tables
# change) and deploy again. Any difference fails the build without touching the DB.
set -uo pipefail

out=$(npx prisma migrate deploy 2>&1); code=$?
echo "$out"
[ "$code" -eq 0 ] && exit 0

if ! grep -q "P3005" <<<"$out"; then
  exit "$code"
fi

echo "migrate-deploy: no migration history found; checking database against prisma/schema.prisma before baselining"
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
diff_code=$?
if [ "$diff_code" -ne 0 ]; then
  echo "migrate-deploy: database does not match prisma/schema.prisma (exit $diff_code); refusing to baseline. Nothing was changed." >&2
  exit 1
fi

set -e
npx prisma migrate resolve --applied 0_init
npx prisma migrate deploy
