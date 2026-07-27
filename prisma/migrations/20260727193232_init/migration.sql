-- CreateEnum
CREATE TYPE "SituacaoVenda" AS ENUM ('CONCLUIDO', 'CANCELADO', 'INCOMPLETO', 'OUTRO');

-- CreateEnum
CREATE TYPE "SituacaoNf" AS ENUM ('EMITIDO', 'CANCELADO', 'ERRO_DE_EMISSAO', 'EM_EMISSAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "SituacaoConferencia" AS ENUM ('NF_EMITIDA', 'NF_NAO_EMITIDA', 'ERRO_DE_EMISSAO', 'ERRO_DE_CANCELAMENTO', 'NF_CANCELADA', 'MULTIPLAS_NOTAS_REVISAO', 'OUTRO');

-- CreateEnum
CREATE TYPE "CommType" AS ENUM ('INTEGRAL', 'FIXED', 'CALC');

-- CreateEnum
CREATE TYPE "CurrencyMode" AS ENUM ('FIXED', 'COL', 'NONE');

-- CreateEnum
CREATE TYPE "ImportSourceType" AS ENUM ('PLATFORM', 'EMITTER');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mappings" JSONB NOT NULL,
    "commType" "CommType" NOT NULL,
    "fixedCommValue" DOUBLE PRECISION,
    "currencyMode" "CurrencyMode" NOT NULL,
    "fixedCurrency" TEXT,
    "currencyCol" TEXT,
    "cleanupChars" TEXT NOT NULL DEFAULT '',
    "statusMap" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmitterConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mappings" JSONB NOT NULL,
    "cleanupChars" TEXT NOT NULL DEFAULT '',
    "fallbackService" TEXT NOT NULL DEFAULT '',
    "statusMap" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmitterConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sourceType" "ImportSourceType" NOT NULL,
    "platformConfigId" TEXT,
    "emitterConfigId" TEXT,
    "originalFilename" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "rawRows" JSONB NOT NULL,
    "competencias" TEXT[],
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "replacedBatchId" TEXT,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "platformConfigId" TEXT NOT NULL,
    "codigoVenda" TEXT NOT NULL,
    "codigoVendaNormalized" TEXT NOT NULL,
    "comprador" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "valorVenda" DOUBLE PRECISION NOT NULL,
    "comissao" DOUBLE PRECISION NOT NULL,
    "valorNf" DOUBLE PRECISION NOT NULL,
    "situacaoVenda" "SituacaoVenda" NOT NULL,
    "competencia" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "emitterConfigId" TEXT NOT NULL,
    "codigoVenda" TEXT NOT NULL,
    "codigoVendaNormalized" TEXT NOT NULL,
    "comprador" TEXT NOT NULL,
    "situacaoNf" "SituacaoNf" NOT NULL,
    "competencia" TEXT NOT NULL,
    "valorNf" DOUBLE PRECISION NOT NULL,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "codigoServico" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChecklistState" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "itemsJson" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChecklistState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_codigo_key" ON "Company"("codigo");

-- CreateIndex
CREATE INDEX "PlatformConfig_companyId_idx" ON "PlatformConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformConfig_companyId_name_key" ON "PlatformConfig"("companyId", "name");

-- CreateIndex
CREATE INDEX "EmitterConfig_companyId_idx" ON "EmitterConfig"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "EmitterConfig_companyId_name_key" ON "EmitterConfig"("companyId", "name");

-- CreateIndex
CREATE INDEX "ImportBatch_companyId_sourceType_idx" ON "ImportBatch"("companyId", "sourceType");

-- CreateIndex
CREATE INDEX "ImportBatch_companyId_platformConfigId_idx" ON "ImportBatch"("companyId", "platformConfigId");

-- CreateIndex
CREATE INDEX "ImportBatch_companyId_emitterConfigId_idx" ON "ImportBatch"("companyId", "emitterConfigId");

-- CreateIndex
CREATE INDEX "Sale_companyId_competencia_idx" ON "Sale"("companyId", "competencia");

-- CreateIndex
CREATE INDEX "Sale_companyId_codigoVendaNormalized_idx" ON "Sale"("companyId", "codigoVendaNormalized");

-- CreateIndex
CREATE INDEX "Sale_companyId_plataforma_idx" ON "Sale"("companyId", "plataforma");

-- CreateIndex
CREATE INDEX "Invoice_companyId_competencia_idx" ON "Invoice"("companyId", "competencia");

-- CreateIndex
CREATE INDEX "Invoice_companyId_codigoVendaNormalized_idx" ON "Invoice"("companyId", "codigoVendaNormalized");

-- CreateIndex
CREATE UNIQUE INDEX "ChecklistState_companyId_competencia_key" ON "ChecklistState"("companyId", "competencia");

-- AddForeignKey
ALTER TABLE "PlatformConfig" ADD CONSTRAINT "PlatformConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmitterConfig" ADD CONSTRAINT "EmitterConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_platformConfigId_fkey" FOREIGN KEY ("platformConfigId") REFERENCES "PlatformConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_emitterConfigId_fkey" FOREIGN KEY ("emitterConfigId") REFERENCES "EmitterConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_platformConfigId_fkey" FOREIGN KEY ("platformConfigId") REFERENCES "PlatformConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_emitterConfigId_fkey" FOREIGN KEY ("emitterConfigId") REFERENCES "EmitterConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChecklistState" ADD CONSTRAINT "ChecklistState_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
