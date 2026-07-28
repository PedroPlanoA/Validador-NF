import { Document, Page, Text, View, Image, Font, StyleSheet } from "@react-pdf/renderer";
import { formatCurrency } from "@/lib/validation/currency";
import type { ChecklistItems } from "@/lib/actions/checklist";

/**
 * Fonts registered from stable Google Fonts (gstatic) TTF URLs — react-pdf
 * needs a direct font file, not the css2 stylesheet endpoint the web app
 * uses. Same two families as the rest of the brand (plano-a-ux): Merriweather
 * for display/numbers, Source Sans 3 for everything else.
 */
Font.register({
  family: "Merriweather",
  fonts: [
    { src: "https://fonts.gstatic.com/s/merriweather/v33/u-4D0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiScCmDxhtNOKl8yDr3icqEw.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/merriweather/v33/u-4D0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiScCmDxhtNOKl8yDrOSAqEw.ttf", fontWeight: 700 },
    { src: "https://fonts.gstatic.com/s/merriweather/v33/u-4D0qyriQwlOrhSvowK_l5UcA6zuSYEqOzpPe3HOZJ5eX1WtLaQwmYiScCmDxhtNOKl8yDrdyAqEw.ttf", fontWeight: 900 },
  ],
});
Font.register({
  family: "Source Sans 3",
  fonts: [
    { src: "https://fonts.gstatic.com/s/sourcesans3/v19/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Ky461EN.ttf", fontWeight: 400 },
    { src: "https://fonts.gstatic.com/s/sourcesans3/v19/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Kxm7FEN.ttf", fontWeight: 600 },
    { src: "https://fonts.gstatic.com/s/sourcesans3/v19/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Kxf7FEN.ttf", fontWeight: 700 },
  ],
});

// Paleta oficial (plano-a-ux/references/tokens.md)
const COLOR = {
  deep: "#00323C",
  teal: "#007878",
  mint: "#14B4A0",
  clay: "#D97D54",
  ink: "#141414",
  paper: "#F4F1EA",
  paperAlt: "#ECE7DC",
  danger: "#C0453B",
  sand: "#DCDCDC",
  text2: "#4a4a4a",
  text3: "#7a7a7a",
};

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Source Sans 3",
    color: COLOR.ink,
    backgroundColor: "#ffffff",
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  logo: { width: 34, height: 27 },
  title: { fontFamily: "Merriweather", fontWeight: 900, fontSize: 16, color: COLOR.ink },
  companyName: { fontFamily: "Source Sans 3", fontWeight: 600, fontSize: 10, color: COLOR.teal, marginTop: 2 },
  competencia: { fontSize: 8, color: COLOR.text3, marginTop: 1 },
  divider: { borderBottomWidth: 1, borderBottomColor: COLOR.sand, marginBottom: 18 },

  summaryBand: { backgroundColor: COLOR.deep, borderRadius: 10, padding: 16, marginBottom: 22 },
  summaryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,.15)",
    paddingBottom: 8,
    marginBottom: 12,
  },
  summaryHeadLabel: { fontSize: 8, fontWeight: 700, color: COLOR.mint, letterSpacing: 1.5, textTransform: "uppercase" },
  summaryPill: {
    fontSize: 7,
    fontWeight: 700,
    color: COLOR.mint,
    backgroundColor: "rgba(20,180,160,.18)",
    borderRadius: 100,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCell: { flex: 1 },
  summaryLabel: { fontSize: 7, fontWeight: 600, color: "rgba(220,220,220,.65)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontFamily: "Merriweather", fontWeight: 900, fontSize: 14, color: "#ffffff" },

  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    color: COLOR.ink,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.sand,
    paddingBottom: 6,
    marginTop: 8,
    marginBottom: 10,
  },

  item: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 7 },
  checkboxBase: { width: 11, height: 11, borderRadius: 3, borderWidth: 1, borderColor: COLOR.sand, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: COLOR.mint, borderColor: COLOR.mint },
  checkMark: { fontSize: 8, fontWeight: 700, color: "#ffffff" },
  itemLabel: { fontSize: 9, color: COLOR.ink },

  table: { borderRadius: 8, overflow: "hidden", borderWidth: 1, borderColor: COLOR.sand },
  tableHeadRow: { flexDirection: "row", backgroundColor: COLOR.deep },
  tableHeadCell: { fontSize: 7, fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5, padding: 8 },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: COLOR.sand },
  tableRowAlt: { backgroundColor: COLOR.paperAlt },
  tableCell: { fontSize: 8.5, color: COLOR.ink, padding: 8 },

  pill: { fontSize: 7, fontWeight: 700, borderRadius: 100, paddingVertical: 2.5, paddingHorizontal: 8, alignSelf: "flex-start" },
  pillDanger: { backgroundColor: "rgba(192,69,59,.12)", color: COLOR.danger },
  pillAttention: { backgroundColor: "rgba(217,125,84,.15)", color: "#a05a38" },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: COLOR.sand,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: COLOR.text3,
  },
});

interface ErrorRow {
  saleId: string;
  codigoVenda: string;
  comprador: string;
  situacao: string;
  statusKey: string;
}

interface ChecklistPdfProps {
  companyName: string;
  competencia: string;
  logoUrl: string;
  vendasConcluidas: number;
  notasEmitidas: number;
  nfNaoEmitidas: number;
  errosCount: number;
  items: ChecklistItems;
  errorRows: ErrorRow[];
}

const CHECKLIST_LABELS: [string, string][] = [
  ["item1", "Alterado acumulador para exportação"],
  ["item3", "Valor total de notas emitidas igual ao emissor"],
  ["item4", "Valor total de notas emitidas conferido com Domínio"],
  ["item5", "Ajustado acumulador para serviços diferentes"],
  ["item6", "Ajustado acumulador para vendas fora de plataforma"],
];

const DANGER_STATUSES = new Set(["ERRO_DE_EMISSAO", "ERRO_DE_CANCELAMENTO"]);

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View style={checked ? [styles.checkboxBase, styles.checkboxChecked] : styles.checkboxBase}>
      {checked && <Text style={styles.checkMark}>{"✓"}</Text>}
    </View>
  );
}

function StatusPill({ statusKey, label }: { statusKey: string; label: string }) {
  const tone = DANGER_STATUSES.has(statusKey) ? styles.pillDanger : styles.pillAttention;
  return (
    <Text style={[styles.pill, tone]}>{label}</Text>
  );
}

export function ChecklistPdfDocument({
  companyName,
  competencia,
  logoUrl,
  vendasConcluidas,
  notasEmitidas,
  nfNaoEmitidas,
  errosCount,
  items,
  errorRows,
}: ChecklistPdfProps) {
  const allErrorsChecked = errorRows.length === 0 || errorRows.every((r) => items[`error:${r.saleId}`]);
  const generatedAt = new Date().toLocaleString("pt-BR");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={logoUrl} style={styles.logo} />
          <View>
            <Text style={styles.title}>Relatório de Conferência</Text>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.competencia}>Competência: {competencia}</Text>
          </View>
        </View>
        <View style={styles.divider} />

        <View style={styles.summaryBand}>
          <View style={styles.summaryHead}>
            <Text style={styles.summaryHeadLabel}>Resumo Executivo de Reconciliação</Text>
            <Text style={styles.summaryPill}>Plano A</Text>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Vendas Concluídas</Text>
              <Text style={styles.summaryValue}>{formatCurrency(vendasConcluidas, "BRL")}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Notas Emitidas</Text>
              <Text style={[styles.summaryValue, { color: COLOR.mint }]}>{formatCurrency(notasEmitidas, "BRL")}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>NF Não Emitidas</Text>
              <Text style={[styles.summaryValue, { color: "#f0b294" }]}>{formatCurrency(nfNaoEmitidas, "BRL")}</Text>
            </View>
            <View style={styles.summaryCell}>
              <Text style={styles.summaryLabel}>Erros Identificados</Text>
              <Text style={[styles.summaryValue, { color: "#f0a99e" }]}>{errosCount}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Itens Obrigatórios de Verificação</Text>
        <View style={styles.item}>
          <Checkbox checked={!!items.item1} />
          <Text style={styles.itemLabel}>Alterado acumulador para exportação</Text>
        </View>
        <View style={styles.item}>
          <Checkbox checked={allErrorsChecked} />
          <Text style={styles.itemLabel}>Corrigido erros ({errorRows.length})</Text>
        </View>
        {CHECKLIST_LABELS.slice(1).map(([key, label]) => (
          <View style={styles.item} key={key}>
            <Checkbox checked={!!items[key]} />
            <Text style={styles.itemLabel}>{label}</Text>
          </View>
        ))}

        {errorRows.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Erros de Reconciliação</Text>
            <View style={styles.table}>
              <View style={styles.tableHeadRow}>
                <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>Código Venda</Text>
                <Text style={[styles.tableHeadCell, { flex: 2 }]}>Comprador</Text>
                <Text style={[styles.tableHeadCell, { flex: 1.6 }]}>Situação</Text>
              </View>
              {errorRows.map((r, i) => (
                <View style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow} key={r.saleId}>
                  <Text style={[styles.tableCell, { flex: 1.2 }]}>{r.codigoVenda}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{r.comprador}</Text>
                  <View style={[styles.tableCell, { flex: 1.6 }]}>
                    <StatusPill statusKey={r.statusKey} label={r.situacao} />
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={styles.footer} fixed>
          <Text>Plano A Contabilidade</Text>
          <Text>Gerado em {generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}
