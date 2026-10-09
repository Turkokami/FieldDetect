-- CreateEnum
CREATE TYPE "EstimateEventType" AS ENUM ('OPENED', 'SECTION_VIEW', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('EACH', 'LINEAR_FT', 'SQ_FT', 'HOUR', 'FLAT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ServiceType" ADD VALUE 'ATTIC_INSULATION';
ALTER TYPE "ServiceType" ADD VALUE 'HOLIDAY_LIGHTING';
ALTER TYPE "ServiceType" ADD VALUE 'COMMERCIAL_PEST_PROGRAM';

-- AlterTable
ALTER TABLE "estimate_line_items" ADD COLUMN     "productId" TEXT,
ADD COLUMN     "unit" "ProductUnit",
ADD COLUMN     "unitCost" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "estimates" ADD COLUMN     "acceptedByName" TEXT,
ADD COLUMN     "acceptedByTitle" TEXT,
ADD COLUMN     "acceptedIp" TEXT,
ADD COLUMN     "acceptedUserAgent" TEXT,
ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "presentation" JSONB,
ADD COLUMN     "publicToken" TEXT,
ADD COLUMN     "signatureDataUrl" TEXT,
ADD COLUMN     "source" TEXT;

-- CreateTable
CREATE TABLE "estimate_events" (
    "id" TEXT NOT NULL,
    "estimateId" TEXT NOT NULL,
    "type" "EstimateEventType" NOT NULL,
    "sessionId" TEXT,
    "section" INTEGER,
    "seconds" INTEGER,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimate_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "serviceType" "ServiceType",
    "unit" "ProductUnit" NOT NULL DEFAULT 'EACH',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "scopes" TEXT[] DEFAULT ARRAY['leads:write', 'products:read']::TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "estimate_events_estimateId_createdAt_idx" ON "estimate_events"("estimateId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "products_organizationId_sku_key" ON "products"("organizationId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "api_keys_organizationId_idx" ON "api_keys"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_publicToken_key" ON "estimates"("publicToken");

-- CreateIndex
CREATE UNIQUE INDEX "estimates_organizationId_externalRef_key" ON "estimates"("organizationId", "externalRef");

-- AddForeignKey
ALTER TABLE "estimate_line_items" ADD CONSTRAINT "estimate_line_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "estimate_events" ADD CONSTRAINT "estimate_events_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill: give every existing estimate a public link token
-- (32 random bytes from two v4 UUIDs, base64url without padding; 43 chars).
UPDATE "estimates"
SET "publicToken" = rtrim(translate(encode(decode(
      replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
      'hex'), 'base64'), '+/', '-_'), '=')
WHERE "publicToken" IS NULL;
