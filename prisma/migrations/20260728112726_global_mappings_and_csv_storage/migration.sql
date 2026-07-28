-- Platform/emitter mappings become global (shared across all companies)
ALTER TABLE "PlatformConfig" DROP CONSTRAINT "PlatformConfig_companyId_fkey";
DROP INDEX "PlatformConfig_companyId_idx";
DROP INDEX "PlatformConfig_companyId_name_key";
ALTER TABLE "PlatformConfig" DROP COLUMN "companyId";
CREATE UNIQUE INDEX "PlatformConfig_name_key" ON "PlatformConfig"("name");

ALTER TABLE "EmitterConfig" DROP CONSTRAINT "EmitterConfig_companyId_fkey";
DROP INDEX "EmitterConfig_companyId_idx";
DROP INDEX "EmitterConfig_companyId_name_key";
ALTER TABLE "EmitterConfig" DROP COLUMN "companyId";
CREATE UNIQUE INDEX "EmitterConfig_name_key" ON "EmitterConfig"("name");

-- Store raw imported rows as compact CSV text instead of JSON
ALTER TABLE "ImportBatch" ADD COLUMN "rawContent" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ImportBatch" ALTER COLUMN "rawContent" DROP DEFAULT;
ALTER TABLE "ImportBatch" DROP COLUMN "rawRows";
