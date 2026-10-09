#!/usr/bin/env bash
# One-time: back up production and mark prisma/migrations/0_init as applied.
#
# Run this from your machine BEFORE deploying any commit whose build script is
# `prisma migrate deploy`. Until it runs, those deploys fail with P3005
# ("database schema is not empty") and change nothing; the previous deploy stays live.
#
#   DATABASE_URL="postgresql://...production direct URL..." ./scripts/baseline-prod-db.sh
#
# Use the direct (non-pooled) connection string. Requires pg_dump matching the
# server's major version.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the PRODUCTION direct connection string}"

backup="fielddetect-prod-$(date -u +%Y%m%dT%H%M%SZ).dump"

echo "1/4 Backing up production to $backup ..."
pg_dump --format=custom --no-owner --no-privileges --file="$backup" "$DATABASE_URL"
pg_restore --list "$backup" > /dev/null   # fails if the archive is unreadable
echo "    backup OK ($(du -h "$backup" | cut -f1)). Keep it somewhere safe."

echo "2/4 Checking production matches prisma/schema.prisma ..."
set +e
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
code=$?
set -e
if [ "$code" -ne 0 ]; then
  echo "    Production differs from prisma/schema.prisma (exit $code). Stopping." >&2
  echo "    Reconcile the schema before baselining; nothing was changed." >&2
  exit 1
fi

echo "3/4 Marking 0_init as applied ..."
npx prisma migrate resolve --applied 0_init

echo "4/4 Status:"
npx prisma migrate status
