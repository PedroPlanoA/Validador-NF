'use strict';

const $ = (id) => document.getElementById(id);

const el = {
  certPonto: $('certPonto'), certEmpresa: $('certEmpresa'), certDetalhe: $('certDetalhe'),
  btnCert: $('btnCert'), btnSair: $('btnSair'),
  conexao: $('conexao'), btnConectar: $('btnConectar'),
  filtros: $('filtros'), tipo: $('tipo'), base: $('base'), de: $('de'), ate: $('ate'),
  leituraInfo: $('leituraInfo'),
  btnCarregar: $('btnCarregar'),
  progresso: $('progresso'), progressoTitulo: $('progressoTitulo'), progressoTexto: $('progressoTexto'),
  resultado: $('resultado'), aviso: $('aviso'),
  incluirCanceladas: $('incluirCanceladas'), btnExcel: $('btnExcel'), btnXmlTodos: $('btnXmlTodos'),
  selecao: $('selecao'), selecaoInfo: $('selecaoInfo'),
  btnXmlSel: $('btnXmlSel'), btnXlsSel: $('btnXlsSel'), btnLimparSel: $('btnLimparSel'),
  tabelas: $('tabelas'), tblInfo: $('tblInfo'), codigosServico: $('codigosServico'),
  seletor: $('seletor'), seletorResumo: $('seletorResumo'), listaCert: $('listaCert'),
  buscaCert: $('buscaCert'), mostrarVencidos: $('mostrarVencidos'),
  btnFecharSeletor: $('btnFecharSeletor'), btnAtualizarCert: $('btnAtualizarCert'),
  abas: $('abas'), painelValidador: $('painelValidador'),
  arquivoLancamentos: $('arquivoLancamentos'), arquivoNome: $('arquivoNome'),
  progressoValidacao: $('progressoValidacao'), kpisValidacao: $('kpisValidacao'),
  tabelasValidacao: $('tabelasValidacao'),
  kpiNaoLoc: $('kpiNaoLoc'), kpiDiverg: $('kpiDiverg'), kpiCancel: $('kpiCancel'),
  kpiQtd: $('kpiQtd'), kpiQtdNota: $('kpiQtdNota'), kpiQtdLabel: $('kpiQtdLabel'),
  kpiTotal: $('kpiTotal'), kpiRetencoes: $('kpiRetencoes'), kpiRetencoesNota: $('kpiRetencoesNota'),
  kpiCanc: $('kpiCanc'), kpiCancNota: $('kpiCancNota'),
};

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
/** Competência se lê por mês: 07/2026, não 31/07/2026. */
const mesAno = (iso) => (iso ? iso.slice(0, 7).split('-').reverse().join('/') : '—');

const formatarDoc = (d) => {
  const s = (d || '').replace(/\D/g, '');
  if (s.length === 14) return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (s.length === 11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return d || '';
};

const SITUACAO = {
  NORMAL: { texto: 'Normal', classe: 'ok' },
  CANCELADA: { texto: 'Cancelada', classe: 'danger' },
  SUBSTITUIDA: { texto: 'Substituída', classe: 'off' },
};

function avisar(mensagem, ehErro = false) {
  if (!mensagem) {
    el.aviso.hidden = true;
    return;
  }
  el.aviso.textContent = mensagem;
  el.aviso.className = ehErro ? 'aviso erro' : 'aviso';
  el.aviso.hidden = false;
}

// ---------- estado ----------

let estado = { conectada: false, carregada: false };

/**
 * Espelha na tela a sessão que o servidor tem.
 *
 * São três estágios: sem certificado (passo 1), conectado sem carga (passo 2) e
 * carregado (resultado). A empresa mostrada no topo é sempre a do certificado
 * conectado agora — não há lista de empresas nem nada salvo.
 */
/**
 * A conta do tempo da última carga, em português.
 *
 * Isto existia só dentro do JSON de `/api/sessao`. Pedir que alguém leia JSON
 * cru para responder "está lento?" é empurrar o problema para a pessoa errada —
 * e quem usa o extrator não tem por que saber o que é um NSU.
 *
 * O que a linha responde é uma pergunta só: a espera foi trabalho ou foi limite?
 * Quase todo o tempo daqui é intervalo obrigatório entre requisições ao ADN. Ver
 * isso separado é o que diz se ainda há o que melhorar ou se o chão já é esse.
 */
function pintarLeitura(l) {
  if (!l || !l.ms) {
    el.leituraInfo.hidden = true;
    return;
  }

  const seg = (ms) => (ms >= 10000 ? `${Math.round(ms / 1000)} s` : `${(ms / 1000).toFixed(1)} s`);
  const partes = [`Carga em ${seg(l.ms)}`, `${l.chamadas} chamada(s) ao ADN`];

  // Primeiro de todos, porque responde a pergunta mais cara daqui: "emiti a nota
  // e ela não aparece". Se a caixa não chegou até hoje, não há o que procurar —
  // o ADN ainda não entregou, e nenhuma releitura vai adiantar.
  if (l.ultimaGeracao) partes.unshift(`Caixa do ADN com documentos até ${dataBR(l.ultimaGeracao)}`);

  if (l.msEspera) partes.push(`${seg(l.msEspera)} de intervalo obrigatório`);
  if (l.msRede) partes.push(`${seg(l.msRede)} de rede`);
  if (l.sondagensPoupadas) partes.push(`${l.sondagensPoupadas} busca(s) reaproveitada(s)`);
  if (l.statusFinal) partes.push(`ADN encerrou com: ${l.statusFinal}`);

  // Só aparece quando saiu do normal — é o caso em que a lentidão TEM explicação,
  // e é a única linha aqui que alguém precisa levar adiante.
  if (l.ritmo > 600) partes.push(`o ADN pediu calma: ritmo em ${l.ritmo} ms`);

  el.leituraInfo.textContent = partes.join(' · ');
  el.leituraInfo.hidden = false;
}

function pintarSessao(s) {
  estado = s;

  el.certPonto.className = `cert-ponto ${s.conectada ? 'ligado' : ''}`;
  el.btnCert.textContent = s.conectada ? 'Trocar certificado' : 'Conectar certificado';
  el.btnSair.hidden = !s.conectada;

  if (s.conectada) {
    el.certEmpresa.textContent = s.nome || formatarDoc(s.cnpj);
    el.certDetalhe.textContent = s.carregada
      ? `${formatarDoc(s.cnpj)} — ${s.notas} nota(s) na memória`
      : formatarDoc(s.cnpj);
  } else {
    el.certEmpresa.textContent = 'Nenhum certificado conectado';
    el.certDetalhe.textContent = 'Conecte um certificado para começar';
  }

  el.conexao.hidden = s.conectada;
  el.filtros.hidden = !s.conectada;
  el.abas.hidden = !s.carregada;
  if (!s.carregada) mostrarAba('notas');
  el.resultado.hidden = !s.carregada;

  if (!s.carregada) {
    el.leituraInfo.hidden = true;
    el.tabelas.innerHTML = '';
    selecionados.clear();
    el.selecao.hidden = true;
    limparValidacao();
  }
}

// ---------- abas ----------

// O validador só faz sentido com notas na mão: ele compara o que foi carregado
// com o que a contabilidade lançou.
function mostrarAba(qual) {
  for (const b of document.querySelectorAll('.aba')) b.classList.toggle('ativa', b.dataset.aba === qual);
  el.resultado.hidden = qual !== 'notas' || !estado.carregada;
  el.painelValidador.hidden = qual !== 'validador';
}

for (const b of document.querySelectorAll('.aba')) {
  b.addEventListener('click', () => mostrarAba(b.dataset.aba));
}

// ---------- período ----------

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function definirPeriodo(qual) {
  const hoje = new Date();
  let inicio;
  let fim;

  if (qual === 'mes-atual') {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  } else if (qual === 'mes-anterior') {
    inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  } else {
    inicio = new Date(hoje.getFullYear(), 0, 1);
    fim = new Date(hoje.getFullYear(), 11, 31);
  }

  el.de.value = iso(inicio);
  el.ate.value = iso(fim);
}

for (const chip of document.querySelectorAll('.chip[data-periodo]')) {
  chip.addEventListener('click', () => definirPeriodo(chip.dataset.periodo));
}

// ---------- fluxo por SSE ----------

/**
 * Executa uma rota SSE mostrando o progresso. Resolve com o evento `fim`.
 * Centraliza o tratamento porque conectar e carregar têm o mesmo ciclo de vida.
 */
function executarFluxo(url, { titulo, aoIniciar, aoStatus }) {
  return new Promise((resolve, reject) => {
    el.progresso.hidden = false;
    el.progressoTitulo.textContent = titulo;
    el.progressoTexto.textContent = '';
    aoIniciar?.();

    const fonte = new EventSource(url);
    let concluido = false;

    const encerrar = () => {
      fonte.close();
      el.progresso.hidden = true;
    };

    fonte.onmessage = (evento) => {
      const d = JSON.parse(evento.data);

      if (d.tipo === 'status' || d.tipo === 'progresso') {
        aoStatus?.(d);
        if (d.tipo === 'status') el.progressoTitulo.textContent = d.mensagem;
        else el.progressoTexto.textContent = d.mensagem;
        return;
      }
      if (d.tipo === 'aviso') return avisar(d.mensagem);
      if (d.tipo === 'erro') {
        concluido = true;
        encerrar();
        const erro = new Error(d.mensagem);
        erro.reconectar = !!d.reconectar;
        return reject(erro);
      }
      if (d.tipo === 'fim') {
        concluido = true;
        encerrar();
        return resolve(d);
      }
    };

    fonte.onerror = () => {
      if (concluido) return;
      encerrar();
      reject(new Error('A conexão com o servidor caiu.'));
    };
  });
}

// ---------- conectar / trocar certificado ----------

el.btnCert.addEventListener('click', async () => {
  if (estado.conectada) await desconectar();
  abrirSeletor();
});

el.btnSair.addEventListener('click', desconectar);
el.btnConectar.addEventListener('click', () => abrirSeletor());

// ---------- seletor de certificado ----------
//
// Substitui o diálogo nativo do Chrome. Num escritório de contabilidade o
// repositório passa de 300 certificados, e o diálogo os mostra todos, sem busca,
// sem CNPJ legível e sem dizer quais venceram — com a mesma empresa aparecendo
// três vezes, duas delas fora do prazo. Escolher errado ali é fácil, e o erro só
// aparece muitos passos depois.

/** @type {Array} a lista completa; o filtro da tela é feito sobre ela. */
let certificados = [];

async function abrirSeletor({ atualizar = false } = {}) {
  el.seletor.showModal();
  el.listaCert.innerHTML = '';
  el.seletorResumo.textContent = atualizar ? 'Relendo o repositório…' : 'Lendo o repositório do Windows…';

  try {
    const r = await fetch(`/api/certificados${atualizar ? '?atualizar=true' : ''}`).then((x) => x.json());
    if (r.erro) throw new Error(r.erro);
    certificados = r.certificados ?? [];
    desenharCertificados();
    el.buscaCert.focus();
  } catch (err) {
    el.seletorResumo.textContent = '';
    el.listaCert.innerHTML = `<p class="cert-vazio">${err.message}</p>`;
  }
}

function desenharCertificados() {
  const busca = el.buscaCert.value.trim().toLowerCase();
  const soDigitos = busca.replace(/\D/g, '');

  const visiveis = certificados.filter((c) => {
    if (c.vencido && !el.mostrarVencidos.checked) return false;
    if (!busca) return true;
    // Busca por dígitos casa CNPJ mesmo digitado com pontuação; por texto, nome.
    if (soDigitos && c.documento.includes(soDigitos)) return true;
    return c.nome.toLowerCase().includes(busca);
  });

  const vencidos = certificados.filter((c) => c.vencido).length;
  el.seletorResumo.textContent =
    `${visiveis.length} de ${certificados.length} certificado(s)` +
    (vencidos && !el.mostrarVencidos.checked ? ` — ${vencidos} vencido(s) ocultos` : '');

  el.listaCert.innerHTML = '';
  if (visiveis.length === 0) {
    el.listaCert.innerHTML = '<p class="cert-vazio">Nenhum certificado com esse nome ou CNPJ.</p>';
    return;
  }

  for (const c of visiveis) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = `cert-item${c.vencido ? ' cert-vencido' : ''}`;
    item.disabled = c.vencido;
    item.innerHTML = `
      <span class="cert-nome">${escapar(c.nome)}</span>
      <span class="cert-doc">${c.documento ? formatarDoc(c.documento) : 'sem CNPJ no certificado'}</span>
      <span class="cert-prazo">${c.vencido ? 'venceu em' : 'vale até'} ${dataBR(c.ate)}</span>`;
    item.addEventListener('click', () => {
      el.seletor.close();
      conectar(c.thumbprint);
    });
    el.listaCert.appendChild(item);
  }
}

el.buscaCert.addEventListener('input', desenharCertificados);
el.mostrarVencidos.addEventListener('change', desenharCertificados);
el.btnFecharSeletor.addEventListener('click', () => el.seletor.close());
el.btnAtualizarCert.addEventListener('click', () => abrirSeletor({ atualizar: true }));

async function desconectar() {
  await fetch('/api/desconectar');
  avisar('');
  pintarSessao({ conectada: false, carregada: false });
}

async function conectar(thumbprint) {
  avisar('');
  el.btnConectar.disabled = true;
  el.btnCert.disabled = true;

  // O painel de progresso mora no cartão de filtros, que ainda está escondido —
  // mostra o cartão antes para o progresso da conexão ficar visível.
  el.conexao.hidden = true;
  el.filtros.hidden = false;

  try {
    const fim = await executarFluxo(`/api/conectar?thumbprint=${encodeURIComponent(thumbprint)}`, {
      titulo: 'Conectando ao ADN…',
    });
    pintarSessao(fim);
  } catch (err) {
    avisar(err.message, true);
    pintarSessao({ conectada: false, carregada: false });
  } finally {
    el.btnConectar.disabled = false;
    el.btnCert.disabled = false;
  }
}

// ---------- carregar ----------

function parametrosCarga() {
  return new URLSearchParams({
    tipo: el.tipo.value,
    de: el.de.value,
    ate: el.ate.value,
    base: el.base.value,
  });
}

el.btnCarregar.addEventListener('click', async () => {
  if (!estado.conectada) return avisar('Conecte um certificado primeiro.', true);
  if (!el.de.value || !el.ate.value) return avisar('Informe o período.', true);
  if (el.de.value > el.ate.value) return avisar('A data inicial é posterior à final.', true);

  avisar('');
  el.btnCarregar.disabled = true;
  el.resultado.hidden = true;

  try {
    const fim = await executarFluxo(`/api/carregar?${parametrosCarga()}`, {
      titulo: 'Localizando notas do período…',
    });
    pintarSessao(fim);
    pintarLeitura(fim.leitura);
    await gerarRelatorio();
  } catch (err) {
    avisar(err.message, true);
    // A janela do Chrome morreu: a sessão foi embora junto, volta ao passo 1.
    if (err.reconectar) pintarSessao({ conectada: false, carregada: false });
  } finally {
    el.btnCarregar.disabled = false;
  }
});

// ---------- relatório ----------

const parametrosExibicao = () =>
  new URLSearchParams({ incluirCanceladas: String(el.incluirCanceladas.checked) });

async function gerarRelatorio() {
  try {
    const dados = await fetch(`/api/relatorio?${parametrosExibicao()}`).then((r) => r.json());
    if (dados.erro) return avisar(dados.erro, true);
    desenhar(dados);
  } catch (err) {
    avisar(`Não consegui montar o relatório: ${err.message}`, true);
  }
}

el.incluirCanceladas.addEventListener('change', gerarRelatorio);
// ---------- seleção de notas ----------

/** NSU das notas marcadas. Sobrevive ao redesenho da tabela. */
const selecionados = new Set();

function atualizarSelecao() {
  const total = selecionados.size;
  el.selecao.hidden = total === 0;
  el.selecaoInfo.textContent = total === 1 ? '1 nota selecionada' : `${total} notas selecionadas`;

  for (const caixa of document.querySelectorAll('.marca-nota')) {
    caixa.checked = selecionados.has(Number(caixa.dataset.nsu));
  }
  // O "marcar todas" de cada tabela reflete o estado das linhas dela.
  for (const cabeca of document.querySelectorAll('.marca-todas')) {
    const nsus = JSON.parse(cabeca.dataset.nsus);
    const marcadas = nsus.filter((n) => selecionados.has(n)).length;
    cabeca.checked = marcadas > 0 && marcadas === nsus.length;
    cabeca.indeterminate = marcadas > 0 && marcadas < nsus.length;
  }
}

el.btnLimparSel.addEventListener('click', () => {
  selecionados.clear();
  atualizarSelecao();
});

const nsusSelecionados = () => [...selecionados].join(',');

el.btnXmlSel.addEventListener('click', () => {
  window.location.href = `/api/xmls?${parametrosExibicao()}&nsus=${nsusSelecionados()}`;
});
el.btnXlsSel.addEventListener('click', () => {
  window.location.href = `/api/excel?${parametrosExibicao()}&nsus=${nsusSelecionados()}`;
});

// ---------- desenho do resultado ----------

function desenhar({ notas, resumo, empresa, filtros, intermediadas }) {
  el.resultado.hidden = false;

  // Nota em que a empresa é só intermediária não é faturamento nem despesa dela,
  // então fica fora do relatório — mas não pode sair calada. Num lote real era
  // 1 em 50, e era justamente ela que derrubava a identificação da empresa.
  if (intermediadas > 0) {
    avisar(
      `${intermediadas} nota(s) do período têm esta empresa apenas como intermediária. ` +
        'Elas estão na caixa do ADN, mas ficam fora do relatório e dos totais.'
    );
  }
  el.btnExcel.disabled = notas.length === 0;
  el.btnXmlTodos.disabled = notas.length === 0;

  // O rótulo acompanha o filtro: contar tomadas sob o título 'emitidas' seria errado.
  el.kpiQtdLabel.textContent = filtros.tipo === 'TOMADA' ? 'Notas tomadas' : 'Notas emitidas';
  el.kpiQtd.textContent = resumo.quantidade;
  el.kpiQtdNota.textContent = 'No período selecionado, canceladas incluídas';

  el.kpiTotal.textContent = moeda.format(resumo.valorServicos);

  el.kpiRetencoes.textContent = moeda.format(resumo.valorRetencoes);
  // Quebra a retenção nas parcelas que existirem — zeradas só ocupariam espaço.
  const parcelas = [
    ['ISS', resumo.valorISSRetido],
    ['IRRF', resumo.valorIRRF],
    ['CSRF', resumo.valorCSRF],
    ['INSS', resumo.valorCP],
  ].filter(([, v]) => v > 0);
  el.kpiRetencoesNota.textContent = parcelas.length
    ? parcelas.map(([nome, v]) => `${nome} ${moeda.format(v)}`).join(' · ')
    : 'Nenhuma retenção no período';

  el.kpiCanc.textContent = resumo.quantidadeCanceladas;
  const notaCanc = [];
  if (resumo.valorCancelado > 0) notaCanc.push(`${moeda.format(resumo.valorCancelado)} fora do total`);
  if (resumo.quantidadeSubstituidas > 0) notaCanc.push(`${resumo.quantidadeSubstituidas} substituída(s)`);
  el.kpiCancNota.textContent = notaCanc.join(' · ') || 'Nenhuma no período';

  const rotulo = filtros.base === 'competencia' ? 'competência' : 'emissão';
  const tipoTexto = { EMITIDA: 'Emitidas', TOMADA: 'Tomadas' }[filtros.tipo] ?? filtros.tipo;
  el.tblInfo.textContent = `${empresa.nome || formatarDoc(empresa.cnpj)} — ${tipoTexto}, de ${dataBR(filtros.de)} a ${dataBR(filtros.ate)}, por ${rotulo}`;

  montarCodigosServico(notas);
  montarTabelas(notas, filtros, empresa);


  atualizarSelecao();
}

/**
 * Os códigos de serviço que aparecem **nesta busca** — nenhum a mais.
 *
 * É a pergunta que abre o acerto do acumulador: mais de um código no mês
 * significa mais de um acumulador a ajustar, e hoje isso só se descobre
 * percorrendo a coluna nota por nota. A lista sai do resultado carregado, então
 * código que não apareceu no período não aparece aqui.
 *
 * O valor conta só nota válida, como o total das tabelas: cancelada não é
 * faturamento e infla a leitura de qual serviço pesa mais.
 */
function montarCodigosServico(notas) {
  el.codigosServico.innerHTML = '';
  if (notas.length === 0) {
    el.codigosServico.hidden = true;
    return;
  }

  const porCodigo = new Map();
  for (const n of notas) {
    const codigo = (n.codigoServico || '').trim();
    const chave = codigo || '—';
    const atual = porCodigo.get(chave) ?? { codigo: chave, descricao: '', quantidade: 0, valor: 0 };
    atual.quantidade++;
    if (n.situacao === 'NORMAL') atual.valor += n.valorServico || 0;
    // A descrição vem do ADN e é a mesma para o código; a primeira que aparecer
    // serve, e sem código não há descrição a mostrar.
    if (!atual.descricao && n.descricaoTribNac) atual.descricao = n.descricaoTribNac;
    porCodigo.set(chave, atual);
  }

  const linhas = [...porCodigo.values()].sort((a, b) => b.quantidade - a.quantidade);

  el.codigosServico.hidden = false;
  el.codigosServico.innerHTML = `
    <div class="tbl-topo">
      <h2>Códigos de serviço</h2>
      <span class="tbl-info">${linhas.length === 1 ? '1 código' : `${linhas.length} códigos`} no período</span>
    </div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>Código</th>
            <th>Descrição</th>
            <th class="num">Notas</th>
            <th class="num">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${linhas
            .map(
              (l) => `
            <tr>
              <td class="cod">${escapar(l.codigo)}</td>
              <td>${escapar(l.descricao || (l.codigo === '—' ? 'Nota sem código de serviço' : ''))}</td>
              <td class="num">${l.quantidade}</td>
              <td class="num">${moeda.format(Math.round(l.valor * 100) / 100)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>`;
}

/** A competência da nota cai em mês diferente do da emissão? */
const competenciaDivergente = (n) => {
  const mesEmissao = (n.dataEmissao || '').slice(0, 7);
  const mesCompetencia = (n.competencia || '').slice(0, 7);
  return Boolean(mesEmissao && mesCompetencia && mesEmissao !== mesCompetencia);
};

/**
 * Monta as tabelas do resultado.
 *
 * Filtrando por data de emissão, as notas saem em DOIS blocos: primeiro as que
 * têm competência de outro mês, depois as demais. É justamente nesse primeiro
 * bloco que a conferência costuma divergir do faturamento lançado — a nota sai em
 * agosto com competência de julho, e cada relatório a coloca num mês diferente.
 * Filtrando por competência a separação não faz sentido, e sai uma tabela só.
 */
function montarTabelas(notas, filtros, empresa) {
  el.tabelas.innerHTML = '';

  if (filtros.base !== 'emissao') {
    el.tabelas.appendChild(cartaoTabela('Notas do período', notas, empresa));
    return;
  }

  const divergentes = notas.filter(competenciaDivergente);
  const mesmoMes = notas.filter((n) => !competenciaDivergente(n));

  if (divergentes.length) {
    el.tabelas.appendChild(
      cartaoTabela('Competência em outro mês', divergentes, empresa, 'destaque')
    );
  }

  el.tabelas.appendChild(
    cartaoTabela('Competência no mês da emissão', mesmoMes, empresa)
  );
}

function cartaoTabela(titulo, notas, empresa, variante = '') {
  const nsus = notas.map((n) => Number(n.nsu));
  const card = document.createElement('div');
  card.className = `card sem-pad tabela-bloco ${variante}`;

  const total = notas.reduce((t, n) => t + (n.situacao === 'NORMAL' ? n.valorLiquido : 0), 0);

  // Baixar os XMLs **deste bloco** sem precisar marcar nota por nota. No
  // validador é o que resolve o caso real: o bloco é a lista de pendências que
  // vai para o cliente, e marcá-la à mão só para baixar é trabalho à toa.
  card.innerHTML = `
    <div class="tbl-topo">
      <h2>${escapar(titulo)}</h2>
      <div class="tbl-acoes">
        <span class="tbl-info">${moeda.format(total)} em notas válidas</span>
        <button type="button" class="btn btn-fantasma btn-pequeno baixar-bloco"
                ${notas.length === 0 ? 'disabled' : ''}>Baixar XMLs deste bloco</button>
      </div>
    </div>
    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th class="col-marca"><input type="checkbox" class="marca-todas" data-nsus='${JSON.stringify(nsus)}'
                 title="Marcar todas desta tabela" aria-label="Marcar todas desta tabela"></th>
            <th>Número</th>
            <th>${notas[0]?.tipo === 'TOMADA' ? 'Prestador' : 'Tomador'}</th>
            <th>Cód. serviço</th>
            <th>Emissão</th>
            <th>Competência</th>
            <th class="num">Valor</th>
            <th class="num">Retenções</th>
            <th>Situação</th>
            <th>XML</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>`;

  card.querySelector('.baixar-bloco')?.addEventListener('click', () => {
    // A lista de NSU é explícita, então o servidor ignora o filtro de canceladas
    // (ver notasDoPedido): o bloco de divergência de cancelamento é feito de
    // notas canceladas, e sairia vazio se o filtro valesse aqui.
    window.location.href = `/api/xmls?${parametrosExibicao()}&nsus=${nsus.join(',')}`;
  });

  const corpo = card.querySelector('tbody');

  if (notas.length === 0) {
    corpo.innerHTML =
      '<tr><td colspan="10" style="text-align:center;padding:36px;color:var(--text-3)">Nenhuma nota aqui.</td></tr>';
    return card;
  }

  for (const n of notas) {
    const sit = SITUACAO[n.situacao] ?? { texto: n.situacao, classe: 'off' };
    const contraparte = n.tipo === 'EMITIDA' ? { nome: n.tomaNome, doc: n.tomaDoc } : { nome: n.emitNome, doc: n.emitDoc };

    const tr = document.createElement('tr');
    if (n.situacao !== 'NORMAL') tr.className = 'inativa';

    tr.innerHTML = `
      <td class="col-marca"><input type="checkbox" class="marca-nota" data-nsu="${n.nsu}"
           aria-label="Selecionar nota ${escapar(n.numero)}"></td>
      <td class="cod"><strong>${escapar(n.numero)}</strong></td>
      <td class="nome">${escapar(contraparte.nome) || '<span style="color:var(--text-3)">Não informado</span>'}
        <span class="doc">${formatarDoc(contraparte.doc)}</span></td>
      <td class="cod">${escapar(n.codigoServico)}
        <small title="${escapar(n.descricaoTribNac)}">${escapar(n.descricaoTribNac)}</small></td>
      <td>${dataBR(n.dataEmissao)}</td>
      <td>${mesAno(n.competencia)}</td>
      <td class="num valor">${moeda.format(n.valorLiquido)}</td>
      <td class="num ret" title="${escapar(detalharRetencoes(n))}">${
        n.totalRetencoes > 0 ? moeda.format(n.totalRetencoes) : '—'
      }</td>
      <td><span class="badge ${sit.classe}">${sit.texto}</span></td>
      <td class="acao"><a class="icon-dl" href="/api/xml?nsu=${n.nsu}&tipo=NFSE"
           title="Baixar XML da nota ${escapar(n.numero)}" aria-label="Baixar XML">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/>
        </svg></a></td>`;
    corpo.appendChild(tr);
  }

  card.querySelector('.marca-todas').addEventListener('change', (ev) => {
    for (const nsu of nsus) {
      if (ev.target.checked) selecionados.add(nsu);
      else selecionados.delete(nsu);
    }
    atualizarSelecao();
  });

  for (const caixa of card.querySelectorAll('.marca-nota')) {
    caixa.addEventListener('change', () => {
      const nsu = Number(caixa.dataset.nsu);
      if (caixa.checked) selecionados.add(nsu);
      else selecionados.delete(nsu);
      atualizarSelecao();
    });
  }

  return card;
}

function detalharRetencoes(n) {
  const partes = [
    ['ISS retido', n.issRetidoValor],
    ['IRRF', n.valorIRRF],
    ['CSRF (PIS/COFINS/CSLL)', n.valorCSRF],
    ['INSS (CP)', n.valorCP],
  ].filter(([, v]) => v > 0);

  if (!partes.length) return 'Sem retenções nesta nota';
  const detalhe = partes.map(([nome, v]) => `${nome}: ${moeda.format(v)}`).join('\n');
  const porQuem = n.issRetidoPor ? `\nISS retido pelo ${n.issRetidoPor.toLowerCase()}` : '';
  return `${detalhe}${porQuem}`;
}

function escapar(s) {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

el.btnExcel.addEventListener('click', () => {
  window.location.href = `/api/excel?${parametrosExibicao()}`;
});

el.btnXmlTodos.addEventListener('click', () => {
  window.location.href = `/api/xmls?${parametrosExibicao()}`;
});

// ---------- início ----------

definirPeriodo('mes-anterior');
fetch('/api/sessao')
  .then((r) => r.json())
  .then((s) => {
    pintarSessao(s);
    if (s.carregada) gerarRelatorio();
  })
  .catch(() => pintarSessao({ conectada: false, carregada: false }));

// ---------- validador de lançamentos ----------

function limparValidacao() {
  el.kpisValidacao.hidden = true;
  el.tabelasValidacao.innerHTML = '';
  el.arquivoNome.textContent = '';
  el.arquivoLancamentos.value = '';
}

el.arquivoLancamentos.addEventListener('change', async () => {
  const arquivo = el.arquivoLancamentos.files?.[0];
  if (!arquivo) return;

  avisar('');
  el.arquivoNome.textContent = `${arquivo.name} · ${(arquivo.size / 1024).toFixed(0)} KB`;
  el.progressoValidacao.hidden = false;
  el.tabelasValidacao.innerHTML = '';
  el.kpisValidacao.hidden = true;

  try {
    // O arquivo vai como corpo binário puro: o servidor lê em memória e descarta.
    const resposta = await fetch(
      `/api/validar?${parametrosExibicao()}&nome=${encodeURIComponent(arquivo.name)}`,
      { method: 'POST', body: arquivo }
    );
    const dados = await resposta.json();
    if (dados.erro) return avisar(dados.erro, true);
    desenharValidacao(dados);
  } catch (err) {
    avisar(`Não consegui conferir o arquivo: ${err.message}`, true);
  } finally {
    el.progressoValidacao.hidden = true;
  }
});

function desenharValidacao(d) {
  el.kpisValidacao.hidden = false;
  el.arquivoNome.textContent =
    `${d.arquivo.nome} · ${d.arquivo.lancamentos} lançamento(s) · ${d.conferidas} de ${d.totalNotas} nota(s) conferidas`;

  const porId = Object.fromEntries(d.grupos.map((g) => [g.id, g.notas.length]));
  el.kpiNaoLoc.textContent = porId.naoLocalizadas;
  el.kpiDiverg.textContent = porId.valorDivergente;
  el.kpiCancel.textContent = porId.naoCancelada;

  el.tabelasValidacao.innerHTML = '';

  if (d.totalApontado === 0) {
    const ok = document.createElement('div');
    ok.className = 'card tudo-certo';
    ok.innerHTML = `<h3>Nenhuma divergência</h3>
      <p class="sub">As ${d.totalNotas} nota(s) do período estão lançadas, com o valor certo.</p>`;
    el.tabelasValidacao.appendChild(ok);
    return;
  }

  // Um bloco por situação, na mesma forma da lista de notas — com seleção e XML.
  for (const g of d.grupos) {
    if (g.notas.length === 0) continue;
    const bloco = cartaoTabela(`${g.titulo} (${g.notas.length})`, g.notas, { cnpj: '' }, 'destaque');
    const topo = bloco.querySelector('.tbl-topo .tbl-info');
    if (topo) topo.textContent = g.descricao;
    el.tabelasValidacao.appendChild(bloco);
  }

  // Reflete nas caixas o que já estava marcado antes de conferir o arquivo — a
  // seleção é de notas, e vale igual nas duas abas.
  atualizarSelecao();
}
