/**
 * Quando a carteira do Acessórias deve ser rebuscada.
 *
 * Duas janelas por dia — **6h e 12h** — ou quando alguém aperta o botão de
 * atualizar na tela. Fora disso, a lista vem do que está gravado, e abre
 * instantaneamente.
 *
 * Não há tarefa agendada: a janela é calculada na leitura. Quem abrir a tela
 * depois das 6h encontra o registro velho e paga a busca; os seguintes já pegam
 * o novo. Sem cron para manter, sem instância acordando à toa, e o efeito é o
 * mesmo — com o detalhe de que, num dia em que ninguém abrir, a busca não
 * acontece, o que é exatamente o desejado.
 */

/** Horas locais em que a carteira vence. */
const JANELAS = [6, 12];

/**
 * Fuso de São Paulo, fixo em -3.
 *
 * O Brasil não tem horário de verão desde 2019. Se voltar a ter, esta constante
 * é o único lugar a mexer — e o sintoma será a atualização acontecendo uma hora
 * fora do combinado, não algo quebrado.
 */
const OFFSET_MIN = -180;

/** O instante mais recente, já passado, em que uma atualização era devida. */
export function ultimaJanela(agora: Date = new Date()): Date {
  const local = new Date(agora.getTime() + OFFSET_MIN * 60_000);
  const hora = local.getUTCHours();
  const meiaNoiteLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());

  const passadas = JANELAS.filter((h) => hora >= h);
  const instanteLocal =
    passadas.length > 0
      ? meiaNoiteLocal + Math.max(...passadas) * 3_600_000
      : // Antes das 6h: vale a última janela de ontem.
        meiaNoiteLocal - 24 * 3_600_000 + Math.max(...JANELAS) * 3_600_000;

  return new Date(instanteLocal - OFFSET_MIN * 60_000);
}

/** O que está gravado ainda serve? */
export function estaFresco(buscadoEm: Date | null | undefined, agora: Date = new Date()): boolean {
  if (!buscadoEm) return false;
  return buscadoEm.getTime() >= ultimaJanela(agora).getTime();
}

/** Texto para a tela: "hoje às 06:00", "ontem às 12:00". */
export function descreverBusca(buscadoEm: Date, agora: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });

  const hoje = dia.format(agora);
  const quando = dia.format(buscadoEm);
  return quando === hoje ? `hoje às ${fmt.format(buscadoEm)}` : `${quando} às ${fmt.format(buscadoEm)}`;
}
