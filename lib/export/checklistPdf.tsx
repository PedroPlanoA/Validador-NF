import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/validation/currency";
import type { ChecklistItems } from "@/lib/actions/checklist";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 16 },
  summaryBox: { flexDirection: "row", gap: 12, marginBottom: 20 },
  summaryCell: { flex: 1, padding: 8, border: "1px solid #ddd", borderRadius: 4 },
  summaryLabel: { fontSize: 8, color: "#666", textTransform: "uppercase", marginBottom: 4 },
  summaryValue: { fontSize: 13, fontWeight: 700 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 8 },
  item: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: 6 },
  checkbox: { width: 10, height: 10, border: "1px solid #333", textAlign: "center", fontSize: 8 },
  errorRow: { flexDirection: "row", gap: 8, marginBottom: 3, fontSize: 9 },
});

interface ChecklistPdfProps {
  companyName: string;
  competencia: string;
  vendasConcluidas: number;
  notasEmitidas: number;
  nfNaoEmitidas: number;
  errosCount: number;
  items: ChecklistItems;
  errorRows: { saleId: string; codigoVenda: string; comprador: string; situacao: string }[];
}

const CHECKLIST_LABELS: [string, string][] = [
  ["item1", "Alterado acumulador para exportação"],
  ["item3", "Valor total de notas emitidas igual ao emissor"],
  ["item4", "Valor total de notas emitidas conferido com Domínio"],
  ["item5", "Ajustado acumulador para serviços diferentes"],
  ["item6", "Ajustado acumulador para vendas fora de plataforma"],
];

function Check({ checked }: { checked: boolean }) {
  return <Text style={styles.checkbox}>{checked ? "X" : ""}</Text>;
}

export function ChecklistPdfDocument({
  companyName,
  competencia,
  vendasConcluidas,
  notasEmitidas,
  nfNaoEmitidas,
  errosCount,
  items,
  errorRows,
}: ChecklistPdfProps) {
  const allErrorsChecked = errorRows.length === 0 || errorRows.every((r) => items[`error:${r.saleId}`]);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório de Conferência — {companyName}</Text>
        <Text style={styles.subtitle}>Competência: {competencia}</Text>

        <View style={styles.summaryBox}>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Vendas Concluídas</Text>
            <Text style={styles.summaryValue}>{formatCurrency(vendasConcluidas, "BRL")}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Notas Emitidas</Text>
            <Text style={styles.summaryValue}>{formatCurrency(notasEmitidas, "BRL")}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>NF Não Emitidas</Text>
            <Text style={styles.summaryValue}>{formatCurrency(nfNaoEmitidas, "BRL")}</Text>
          </View>
          <View style={styles.summaryCell}>
            <Text style={styles.summaryLabel}>Erros Identificados</Text>
            <Text style={styles.summaryValue}>{errosCount}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Itens Obrigatórios de Verificação</Text>
        <View style={styles.item}>
          <Check checked={!!items.item1} />
          <Text>Alterado acumulador para exportação</Text>
        </View>
        <View style={styles.item}>
          <Check checked={allErrorsChecked} />
          <Text>Corrigido erros ({errorRows.length})</Text>
        </View>
        {CHECKLIST_LABELS.slice(1).map(([key, label]) => (
          <View style={styles.item} key={key}>
            <Check checked={!!items[key]} />
            <Text>{label}</Text>
          </View>
        ))}

        {errorRows.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Erros de Reconciliação</Text>
            {errorRows.map((r, i) => (
              <View style={styles.errorRow} key={i}>
                <Text>{r.codigoVenda}</Text>
                <Text>{r.comprador}</Text>
                <Text>{r.situacao}</Text>
              </View>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}
