-- Venda com situação "Incompleto" e sem nenhuma nota fiscal casada passa a ter
-- conferência própria ("Venda Incompleta") em vez de cair no genérico "Outro".
ALTER TYPE "SituacaoConferencia" ADD VALUE 'VENDA_INCOMPLETA';
