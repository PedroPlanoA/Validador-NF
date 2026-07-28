-- Product identification on Sale rows
ALTER TABLE "Sale" ADD COLUMN "produto" TEXT NOT NULL DEFAULT 'Não Identificado';
CREATE INDEX "Sale_companyId_plataforma_produto_idx" ON "Sale"("companyId", "plataforma", "produto");

-- Per-company/platform/product commission override
CREATE TABLE "ProductOverride" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plataforma" TEXT NOT NULL,
    "produto" TEXT NOT NULL,
    "commissionPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductOverride_companyId_plataforma_produto_key" ON "ProductOverride"("companyId", "plataforma", "produto");

ALTER TABLE "ProductOverride" ADD CONSTRAINT "ProductOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Manual "value divergence verified" marks
CREATE TABLE "ValueCheckAnnotation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "codigoVenda" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValueCheckAnnotation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ValueCheckAnnotation_companyId_codigoVenda_competencia_key" ON "ValueCheckAnnotation"("companyId", "codigoVenda", "competencia");

ALTER TABLE "ValueCheckAnnotation" ADD CONSTRAINT "ValueCheckAnnotation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
