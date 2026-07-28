-- Actual sale date (day precision), shown as a reference column on Vendas
ALTER TABLE "Sale" ADD COLUMN "dataVenda" TIMESTAMP(3);

-- Manual "reference competência" entered at import time, for locating files
-- on the Importações screen only — never used for analysis
ALTER TABLE "ImportBatch" ADD COLUMN "referenceCompetencia" TEXT;
