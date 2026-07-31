-- Texto original da situação da nota, antes do mapeamento para o enum.
-- Permite descobrir quais valores do relatório do emissor não estão mapeados:
-- antes disso um valor não mapeado virava "Outro" sem deixar rastro de qual era
-- o texto de origem. Linhas já importadas ficam com "" até serem reanalisadas.
ALTER TABLE "Invoice" ADD COLUMN "situacaoNfOriginal" TEXT NOT NULL DEFAULT '';
