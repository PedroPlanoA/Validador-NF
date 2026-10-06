// Parser de XML mínimo, suficiente para o leiaute da NFS-e nacional.
//
// Por que não regex: o XML da NFS-e repete o mesmo nome de tag em ramos
// diferentes — `xNome` existe em `emit` e em `toma`, `CNPJ` existe em quatro
// lugares. Um `/<xNome>([^<]*)</` pega o primeiro que aparecer e troca o nome do
// tomador pelo do emitente sem avisar. Navegar por caminho elimina essa classe
// de erro inteira.

const VAZIO = Object.freeze({ nome: '', attrs: {}, filhos: [], texto: '' });

function decodificarEntidades(s) {
  if (!s.includes('&')) return s;
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&'); // por último, senão desfaz os anteriores
}

function lerAtributos(bruto) {
  const attrs = {};
  for (const m of bruto.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) {
    attrs[m[1]] = decodificarEntidades(m[2]);
  }
  return attrs;
}

/** Converte uma string XML em árvore de nós `{ nome, attrs, filhos, texto }`. */
export function parseXml(xml) {
  const limpo = xml
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, (_, c) => c.replace(/[<&]/g, (ch) => (ch === '<' ? '&lt;' : '&amp;')));

  const raiz = { nome: '#raiz', attrs: {}, filhos: [], texto: '' };
  const pilha = [raiz];

  const tags = /<([\/!?]?)([\w:.-]+)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let m;
  let ultimoFim = 0;

  while ((m = tags.exec(limpo)) !== null) {
    const [bruto, fecha, nome, attrsBrutos, auto] = m;
    const topo = pilha[pilha.length - 1];

    // Texto acumulado desde a tag anterior pertence ao nó aberto.
    const texto = limpo.slice(ultimoFim, m.index);
    if (texto.trim()) topo.texto += decodificarEntidades(texto);
    ultimoFim = m.index + bruto.length;

    if (fecha === '/') {
      // Fecha o nó correspondente. Se vier fora de ordem, sobe até achar — XML
      // assinado vem sempre bem formado, mas não vale derrubar o processo por isso.
      for (let i = pilha.length - 1; i > 0; i--) {
        if (pilha[i].nome === nome) {
          pilha.length = i;
          break;
        }
      }
      continue;
    }
    if (fecha) continue; // <!DOCTYPE, <?...

    const no = { nome, attrs: lerAtributos(attrsBrutos), filhos: [], texto: '' };
    topo.filhos.push(no);
    if (!auto) pilha.push(no);
  }

  return raiz.filhos[0] ?? { ...VAZIO };
}

/** Primeiro nó no caminho `a/b/c` a partir de `no`. Nunca retorna null. */
export function nó(no, caminho) {
  let atual = no;
  for (const parte of caminho.split('/')) {
    if (!atual) return VAZIO;
    atual = atual.filhos.find((f) => f.nome === parte);
  }
  return atual ?? VAZIO;
}

/** Texto do nó no caminho, já sem espaços nas pontas. '' se não existir. */
export function txt(no, caminho) {
  return nó(no, caminho).texto.trim();
}

/** Primeiro caminho que existir, na ordem — para campos que mudam de lugar. */
export function txtAlt(no, ...caminhos) {
  for (const c of caminhos) {
    const v = txt(no, c);
    if (v) return v;
  }
  return '';
}

/** Todos os nós no caminho (o último segmento pode repetir). */
export function nós(no, caminho) {
  const partes = caminho.split('/');
  const ultimo = partes.pop();
  const pai = partes.length ? nó(no, partes.join('/')) : no;
  return pai.filhos.filter((f) => f.nome === ultimo);
}
