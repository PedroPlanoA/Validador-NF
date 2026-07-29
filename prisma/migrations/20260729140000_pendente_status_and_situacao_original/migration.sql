-- Add "Pendente" as a mappable nota fiscal status
ALTER TYPE "SituacaoNf" ADD VALUE 'PENDENTE';

-- Original (pre-mapping) sale status text, shown alongside the
-- standardized status as a reference — never used for logic.
ALTER TABLE "Sale" ADD COLUMN "situacaoVendaOriginal" TEXT NOT NULL DEFAULT '';
