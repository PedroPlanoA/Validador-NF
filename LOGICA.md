# Lógica do Validador de NF — Plano A Contabilidade

Documento de referência da **estrutura e das regras de negócio** da aplicação.
Serve para retomar o desenvolvimento sem depender do histórico de conversa: se
uma regra não estiver aqui nem no código, ela não existe.

Última atualização: 31/07/2026.

---

## 1. O que o sistema faz

Confere a **situação fiscal** de infoprodutores: cruza o que foi **vendido**
(relatório exportado da plataforma de venda) com o que foi **faturado**
(relatório exportado do emissor de nota fiscal) e aponta onde os dois não
batem — venda sem nota, nota com erro de emissão, cancelamento inconsistente,
valor divergente.

O trabalho é organizado **por empresa** (cliente da contabilidade) e **por
competência** (mês de referência fiscal).

### Fluxo de uso

1. **Mapear** uma vez cada plataforma e cada emissor (quais colunas do arquivo
   correspondem a quais campos, como traduzir os textos de status, como
   calcular a comissão).
2. **Importar** o relatório de vendas e o relatório de notas da empresa.
3. O sistema reconcilia automaticamente e o analista trabalha nas abas
   **Vendas**, **Notas Fiscais**, **Painel de Erros** e **Produtos**.
4. **Checklist** fecha a competência e gera o PDF do fechamento.

---

## 2. Stack e estrutura de pastas

- **Next.js 16.2** (App Router, Turbopack), **React 19**, **Tailwind 4**
- **Prisma 7** com adapter Neon (Postgres serverless)
- `xlsx` + `papaparse` para leitura de planilhas, `chart.js` para gráficos,
  `@react-pdf/renderer` para o PDF do checklist
- Deploy na Vercel

```
app/
  companies/                    escolha da empresa (entrada do sistema)
  config/                       mapeamentos globais (fora do contexto de empresa)
  c/[companyId]/
    layout.tsx                  faixa lateral fixa + botão flutuante
    dashboard/ sales/ invoices/ products/ errors/ checklist/ imports/
    config/                     mesmos mapeamentos, acessados de dentro da empresa
  api/c/[companyId]/
    imports/                    upload, reanálise e exclusão de lote
    export/                     XLSX de vendas, notas, conciliação + PDF do checklist
components/
  layout/    faixa lateral, botão flutuante, seletor de competência, abas de config
  ui/        Card/PanelCard, Button, Badge, Table (classes), FilterBar, EmptyState,
             PageTitle/PageHeader, Pagination, Input, Combobox, ExportRawDataButton
  wizard/    assistente de mapeamento e formulário de upload
  dashboard/ KpiCard e os gráficos (Situação NF, Plataforma, Tipo)
lib/
  parsing/         leitura de planilha, números, datas/competência, palpites de coluna
  mapping/         tipos, aplicação do mapeamento, normalização de código
  reconciliation/  engine (puro), classify (tabela de decisão), labels, types
  imports/         importService (transações de import/reanálise)
  actions/         Server Actions e leituras (reconciliação, produtos, checklist...)
  export/          geração de XLSX e do PDF
prisma/            schema + migrations
```

**Regra de arquitetura:** `lib/reconciliation/` é **puro** (sem acesso a banco).
Quem busca dados é `lib/actions/`. Isso é o que permite reanálise e testes sem
tocar no Postgres.

---

## 3. Modelo de dados (prisma/schema.prisma)

| Modelo | Papel |
|---|---|
| `Company` | Cliente da contabilidade (código, nome, CNPJ). |
| `PlatformConfig` | Mapeamento de uma plataforma de venda. **Global** — compartilhado por todas as empresas. |
| `EmitterConfig` | Mapeamento de um emissor de NF. **Global**, mesma razão. |
| `ImportBatch` | Um arquivo importado. Guarda `rawContent` (só as colunas mapeadas, em CSV), as `competencias` encontradas e a `referenceCompetencia`. |
| `Sale` | Uma linha do relatório de vendas, já padronizada. |
| `Invoice` | Uma linha do relatório de notas, já padronizada. Guarda `situacaoNfOriginal` (texto de status como veio no arquivo). |
| `ProductOverride` | % de comissão fixado manualmente por (empresa, plataforma, produto). |
| `ValueCheckAnnotation` | Marca "conferi essa divergência de valor e está certa". |
| `ChecklistState` | Estado dos itens do checklist por (empresa, competência). |

### Decisões que não são óbvias no schema

- **Mapeamentos são globais.** As mesmas plataformas se repetem entre clientes,
  então mapear uma vez serve para todos. Só `Sale`/`Invoice`/`ImportBatch` são
  por empresa.
- **`ImportBatch.rawContent` guarda apenas as colunas mapeadas, em CSV** — não o
  arquivo original e não JSON. CSV não repete o nome do campo em cada linha, o
  que reduz muito o tamanho no banco, e as colunas mapeadas são suficientes para
  reanalisar depois.
- **`referenceCompetencia` é só para localizar o arquivo** na aba Importações.
  **Nunca** entra em análise: a competência que vale vem da nota fiscal.
- **`ValueCheckAnnotation` é chaveada por `codigoVenda`**, não por `saleId`,
  porque reimportar/reanalisar apaga e recria as linhas de `Sale`. A identidade
  de negócio de uma venda é o código dela, não o id efêmero da linha.
- **`SituacaoConferencia` existe como enum no Postgres mas nenhuma tabela a
  usa** — a conferência é sempre **calculada em tempo de leitura**, nunca
  gravada. O enum é mantido em sincronia por consistência.

---

## 4. Importação

### 4.1 Leitura do arquivo
O arquivo **nunca sobe inteiro**. O navegador lê a planilha e envia apenas as
colunas mapeadas, comprimidas. Duas peças:

- `lib/parsing/mapSpreadsheet.ts` — lê CSV **em pedaços** (`chunk` do
  PapaParse), reduzindo cada linha às colunas mapeadas na hora e descartando o
  resto, de forma que o pico de memória acompanhe o resultado e não o arquivo.
  XLS/XLSX não permite leitura incremental sem outra biblioteca, então ali o
  arquivo é aberto inteiro.
- `lib/parsing/parseSpreadsheet.ts` — leitura completa, usada só pelo
  assistente de mapeamento (que precisa dos nomes originais das colunas para a
  amostra). `guessColumn.ts` e `statusGuess.ts` alimentam os palpites.

### 4.2 Duas etapas separadas de propósito
1. **`mapSaleRow` / `mapInvoiceRow`** — a **única** etapa que conhece os nomes
   originais das colunas. Roda **no navegador**, linha por linha, e rechaveia os
   valores pelos nomes padrão do sistema. O resultado é exatamente o que vai
   para `rawContent`.
2. **`standardizeMapped*`** — no **servidor**: converter número, calcular
   comissão, traduzir status, extrair competência, normalizar o código.

A separação é o que permite **reanalisar** um lote antigo aplicando o
mapeamento atual, mesmo que a plataforma tenha mudado os nomes das colunas do
relatório desde então — e é também o que reduz o tamanho do upload, já que só as
poucas colunas usadas trafegam. Ao cliente vão apenas os **mapeamentos de
coluna**; comissão, `statusMap` e `cleanupChars` nunca saem do servidor.

### 4.3 Por que o arquivo grande cabe agora
O gargalo é o **limite de tamanho de corpo de requisição** da plataforma
(4,5 MB numa função serverless), não o banco. Três medidas, nesta ordem de
impacto:

1. **Só as colunas mapeadas sobem** — 8 a 10 colunas em vez das dezenas do
   relatório. Sozinho, isso já multiplica por várias vezes o arquivo que passa.
2. **Gzip no navegador** (`CompressionStream`, `lib/parsing/gzipText.ts`). CSV
   fiscal é repetitivo e comprime bem: medido **7,8×** num teste de 50 mil
   linhas (4,34 MB → 0,56 MB). Onde `CompressionStream` não existir, o texto vai
   sem compressão e o servidor aceita as duas formas — daí o cabeçalho próprio
   `x-body-encoding`, e **não** `Content-Encoding`, que proxies interpretariam.
3. **Corpo binário, metadados na query.** O corpo é o CSV comprimido; fonte,
   config, nome do arquivo e competência de referência vão na query string.
   JSON repetiria o nome de cada campo por linha e ainda cresceria com o escape
   de `\n` e `"`.

Depois disso o gargalo passa a ser **tempo**: `maxDuration = 300` nas rotas de
importar e reanalisar, transação com `timeout: 120s` (o padrão de 5s do Prisma
não dá conta) e inserção em lotes de 5.000 linhas — um `createMany` único com
centenas de milhares de linhas estoura o limite de parâmetros do Postgres.

Verificado de ponta a ponta com 50 mil linhas: importação em ~63 s e reanálise
em ~73 s no servidor de desenvolvimento, com status, competência, valor e código
normalizado corretos.

### 4.4 Mapeamento de status é comparação exata
`statusMap[texto_do_relatório]` é busca de chave em objeto: **caractere por
caractere**. Uma letra em outra caixa, um acento ou um espaço a mais fazem o
valor não casar, e ele cai no `?? "OUTRO"`. Já aconteceu na prática: o relatório
trazia `Falha ao cancelar` e o mapeamento tinha `Falha ao Cancelar` — 79 notas
foram para "Outro" sem nenhum sinal.

A comparação **continua exata de propósito** (decisão do usuário): tolerar caixa
e espaço esconderia a diferença em vez de mostrá-la. O que mudou é que agora ela
**aparece**:

- `Invoice.situacaoNfOriginal` guarda o texto original, como
  `Sale.situacaoVendaOriginal` já fazia. Sem isso não havia como saber qual texto
  gerou o "Outro".
- `listUnmappedStatuses` (`lib/actions/unmappedStatuses.ts`) lista os textos que
  **nenhuma chave do mapeamento cobre**, com a fonte e a contagem. A detecção é
  por comparação com as chaves, e **não** por "resultou em Outro": um valor
  mapeado de propósito para Outro está correto e não é reportado.
- `UnmappedStatusAlert` mostra isso no topo da aba **Importações**, com o texto
  entre aspas em monoespaçada (para copiar e colar exatamente) e link direto para
  editar aquele mapeamento.
- Na etapa de Status do assistente, valores **não presentes na amostra** (os
  digitados à mão, ou herdados de um mapeamento salvo) podem ser **editados** e
  **excluídos**. Corrigir o texto é renomear a chave, já que a chave é o que
  precisa casar com o relatório. Valor vindo da amostra não é editável: ele é o
  texto exato do arquivo.

**Ressalva:** linhas importadas antes de `situacaoNfOriginal` existir têm o texto
vazio e não entram no aviso. **Reanalisar** o lote preenche o campo — e é o mesmo
passo que aplica um mapeamento corrigido, sem precisar reimportar.

### 4.5 Substituição por competência
Ao importar, o sistema apaga **só** as linhas daquele `configId` **nas
competências presentes no arquivo novo**. Reenviar o relatório de julho da
Hotmart não toca em junho da Hotmart, e nunca toca em outro emissor/plataforma.

### 4.6 Comissão (`commType`)
| Modo | Cálculo |
|---|---|
| `INTEGRAL` | 100% — o valor da nota é o valor da venda. |
| `FIXED` | percentual fixo configurado (`fixedCommValue`). |
| `CALC` | `recebido / (faturamentoProdutor + faturamentoCoprodutor) × 100`. Se o denominador for 0, cai para 100%. |

`valorNf` (valor **esperado** da nota) = `valorVenda × comissão / 100`.

**`ProductOverride` vence sempre.** Se existe percentual fixado para
(empresa, plataforma, produto), ele substitui o cálculo acima — tanto na
importação quanto na reanálise. É o contador dizendo "para este produto a
coprodução é X%, e eu sei que é isso".

### 4.7 Moeda (`currencyMode`)
`FIXED` (moeda fixa configurada) · `COL` (lida de uma coluna) · `NONE` → BRL.

### 4.8 Competência da nota de devolução (falha do relatório do emissor)
O relatório do emissor traz **nota de devolução com a competência da venda
original**, não a do mês em que a devolução foi emitida. Isso jogava a devolução
para um mês em que ela não aconteceu e desencontrava o dashboard.

Regra: quando o `tipo` da nota é de devolução, a competência vem da **data de
emissão/autorização**, mapeada no campo opcional `dataEmissao` do emissor. Sem
essa coluna mapeada, ou quando o valor não é uma data legível, cai de volta na
coluna de competência — comportamento anterior, para não inventar um mês.

Devolução é reconhecida por `isDevolucao` (`lib/mapping/tipoNota.ts`): `tipo`
contendo o radical **devolu**, em qualquer caixa e com ou sem acento. Pega
"NF-e Devolução", "Devolução", "Nota de devolução", "Devolucao". Comparação
frouxa de propósito — `tipo` é texto livre do emissor, e uma lista fechada
quebraria no primeiro emissor novo.

**Consequência operacional:** mapear a coluna nova **não** corrige o que já foi
importado. Reanalisar não resolve, porque o CSV guardado em `rawContent` não tem
essa coluna nos lotes antigos (nesse caso a regra cai no fallback). Para
corrigir competências de devolução já na base é preciso **reimportar** o
relatório do emissor.

### 4.9 Competência e datas
`extractCompetence` devolve `YYYY-MM`, tentando ISO → `DD/MM/AAAA` → `Date`
nativo, e caindo em **um único** sentinela `"Sem Competência"` quando nada
funciona. `parseFullDate` faz o mesmo com precisão de dia (`Sale.dataVenda`,
exibida na aba Vendas); devolve `null` quando não dá para interpretar.

### 4.10 Normalização do código da venda
`normalizeCode` remove os `cleanupChars` configurados e passa para minúsculas.
É gravado em `codigoVendaNormalized` **no momento da importação**, com os
`cleanupChars` do config que originou aquela linha — nunca recalculado depois
com o config "errado" (bug do protótipo antigo, que usava o `cleanupChars` do
primeiro emissor para todas as notas).

`normalizeInvoiceNumber` reduz o número da nota a dígitos e tira zeros à
esquerda; sem dígitos, vira `"S/N"`.

---

## 5. Reconciliação

`lib/reconciliation/engine.ts` agrupa as notas por `codigoVendaNormalized` e,
para cada venda:

| Notas casadas | Comportamento |
|---|---|
| 0 | classifica com `situacaoNf = null`. |
| 1 | classifica contra o status daquela nota. |
| N, **mesmo** `tipo` | `MULTIPLAS_NOTAS_REVISAO` — duas NF-e para a mesma venda é problema de dado, e escolher uma silenciosamente esconderia isso. |
| N, `tipo` **diferentes** | padrão legítimo (ex.: NFS-e + NF-e). Soma os valores e classifica contra um status virtual combinado. |

`combineStatus` (prioridade): `ERRO_DE_EMISSAO` → `CANCELADO` → `EM_EMISSAO` →
`PENDENTE` → `EMITIDO` (só se todas) → `OUTRO`. Um erro em qualquer nota tem de
aparecer, mesmo que as outras estejam boas.

### 5.1 Tabela de decisão (`classify`)

| Situação da venda | Situação da NF | Conferência |
|---|---|---|
| Concluído | (nenhuma nota) | **NF Não Emitida** |
| Concluído | Emitido | **NF Emitida** |
| Concluído | Erro de Emissão | **Erro de Emissão** |
| Concluído | Cancelado | **Erro Cancelamento** |
| Concluído | outro | Outro |
| Cancelado | Emitido | **Erro Cancelamento** |
| Cancelado | Cancelado ou nenhuma | **NF Cancelada** |
| Cancelado | outro | Outro |
| Incompleto / Outro | Erro de Emissão | **Erro de Emissão** |
| **Incompleto** | **(nenhuma nota)** | **Venda Incompleta** |
| Incompleto / Outro | resto | Outro |

**Venda Incompleta** é um estado **esperado**, não um erro: a venda não se
concretizou, então não há nota a emitir. Por isso o tom do selo é neutro e ela
**não** entra em `ERROR_STATUSES`.

### 5.2 Divergência de valor
`valorDivergente = true` quando existe valor faturado e ele difere do valor
calculado em mais de **R$ 0,01** — e **somente quando a venda está em Real**
(`BRL`, `R$`, `REAL`). Nota fiscal é sempre em Real; comparar um valor calculado
em dólar com o valor da nota seria comparar unidades diferentes, não divergência.

A divergência é **independente** da conferência: uma venda pode estar
corretamente "NF Emitida" e ainda assim com o valor errado.

### 5.3 Competência efetiva — a regra mais importante
Competência é dado **contábil**, e a única fonte confiável é a nota fiscal
emitida. A competência da venda só é usada enquanto a venda ainda não tem nota
casada. **Todo filtro, análise e checklist usa `competenciaEfetiva`.**

Ordem de preferência (`resolveCompetenciaEfetiva` no engine):

1. a competência da primeira nota casada que **não** é devolução — é a emissão
   que caracteriza a venda;
2. se só houver devolução, a competência **mais antiga** entre elas;
3. sem nota casada, a competência da própria venda, como provisório.

O critério de desempate existe porque antes se usava `matched[0]`, e a consulta
de notas não tem ordenação garantida. Enquanto o emissor mandava a devolução com
a competência da venda original (ver 4.8) isso era inofensivo, porque as duas
coincidiam. Corrigida a competência da devolução, o par passa a cruzar dois
meses, e a competência da venda não pode depender da ordem em que o banco
devolveu as linhas.

Referência interna: a competência de 4.8 é a **da nota de devolução**; esta aqui é
a **da venda**.

#### A lista de competências do seletor
`listCompetencias` é a **união** de dois conjuntos: a competência efetiva de cada
linha de reconciliação (lado das vendas) **e** a competência de toda nota fiscal
da empresa.

O segundo conjunto é indispensável porque o motor percorre as vendas: nota sem
venda casada não gera linha nenhuma. Sem ele, empresa com relatório de notas e
sem relatório de vendas ficava com o seletor **vazio** — apesar de a aba Notas
Fiscais, o faturamento do dashboard e o checklist filtrarem exatamente por essa
competência.

Consequência aceita: é possível selecionar uma competência que só tem notas. Aí a
aba Vendas mostra estado vazio e as seções de nota funcionam normalmente, o que é
o comportamento correto.

Observação de custo, ainda não endereçada: essa função roda a reconciliação
completa só para montar o seletor, e a faixa lateral está no layout — ou seja,
acontece em toda página de empresa. Trocar por duas consultas `distinct` seria
muito mais barato, ao preço de eventualmente listar um mês em que existiam vendas
mas todas foram faturadas em outro mês.

### 5.4 Erros que contam como erro
```
ERROR_STATUSES = [NF_NAO_EMITIDA, ERRO_DE_CANCELAMENTO, ERRO_DE_EMISSAO]
```
Fora de propósito: `NF_CANCELADA` (estado limpo), `OUTRO`, `VENDA_INCOMPLETA` e
`MULTIPLAS_NOTAS_REVISAO` — esta última é acompanhada em separado no Painel de
Erros, porque é outro tipo de pendência e o cliente quer vê-la sozinha.

---

## 6. Comportamento de cada aba

### Tela de empresas (entrada do sistema)
- Cards ordenados por **código, crescente**, com comparação **numérica** — a
  ordenação de texto colocaria "10" antes de "2". Código não numérico vai para o
  fim da lista.
- A busca casa **código** e **nome** por trecho, mas **CNPJ somente completo**
  (14 dígitos, com ou sem pontuação). Antes qualquer trecho de número casava com
  o CNPJ de qualquer empresa, então procurar o código "3" trazia meia lista.
- O lápis no card edita o cadastro; nada de importado é afetado (o vínculo é pelo
  `id`).

| Aba | Filtra por competência? | Observações |
|---|---|---|
| **Dashboard** | depende da seção | ver abaixo |
| **Vendas** | sim (`competenciaEfetiva`) | paginada, 10 por página |
| **Notas Fiscais** | sim (competência da própria nota) | filtros de status, serviço, tipo e plataforma |
| **Produtos** | não | abas por plataforma; ajusta % de comissão |
| **Painel de Erros** | **não, de propósito** | precisa mostrar toda divergência, senão um erro fora do mês selecionado ficaria escondido. Filtra por plataforma, situação NF, situação da venda e situação da reconciliação — **não** por produto (removido a pedido do usuário) |
| **Checklist** | sim, e **exige** uma competência | audita um mês por vez |
| **Importações** | **não** | precisa listar todo relatório ativo |

### Dashboard — cada seção vem do relatório certo
- **KPIs de erro** (Erros de Emissão, NF Não Emitida, Erro Cancelamento) —
  reconciliação venda × nota, **nunca** filtrados por competência.
- **Notas Emitidas**, **Faturamento por Serviço**, **Resumo por Moeda**,
  **Desempenho por Plataforma**, **Emissões por Tipo** — todos sobre notas com
  situação `EMITIDO` na competência selecionada. Nota cancelada, com erro ou
  pendente **não é faturamento real** e não infla esses totais.
- **Moeda e plataforma da nota** vêm do relatório de vendas, casando pelo código
  da venda; sem casamento aparece explicitamente "Moeda/Plataforma Não
  Identificada", em vez de assumir BRL.

#### Os dois painéis de tipo de nota

| Painel | Mede | Devolução | Aparece quando |
|---|---|---|---|
| **Proporção por Tipo** (rosca) | quantidade | **excluída** | há mais de um tipo **fora** de devolução |
| **Emissões por Tipo** (barras) | valor em R$ | incluída | há mais de um tipo, contando devolução |

Devolução fica fora da proporção porque não é faturamento — incluí-la
distorceria a leitura de "quanto de cada tipo a empresa emite". O volume
completo está no gráfico de valores. Devolução é reconhecida por `tipo` contendo
`"devolu"` (o campo é texto livre do emissor, então a comparação é frouxa de
propósito, para pegar "NF-e Devolução", "Devolucao" etc.).

A faixa inferior do dashboard tem de 1 a 3 painéis (Resumo por Moeda sempre,
mais os dois de tipo quando cabem) e o número de colunas acompanha.

#### Cliques nos gráficos
Todos os gráficos levam à listagem correspondente: Situação NF → `invoices?status=`,
Proporção/Emissões por Tipo → `invoices?tipo=`, Desempenho por Plataforma →
`invoices?plataforma=` — **inclusive** a barra de "Plataforma Não Identificada".

Como `Invoice` não tem coluna de plataforma, o filtro `plataforma` da aba Notas
Fiscais resolve primeiro os `codigoVendaNormalized` das vendas daquela
plataforma e filtra as notas por esse conjunto. É feito no banco, e não em
memória, porque a listagem é paginada.

O valor especial `"Plataforma Não Identificada"` (constante compartilhada em
`lib/reconciliation/labels.ts`, usada pelo gráfico e pelo filtro para nunca
divergirem) **inverte** essa lógica: devolve as notas cujo código não existe em
venda nenhuma da base, via `notIn`. Também aparece como opção no menu de
filtros da aba.

#### Nota sem venda correspondente é estado esperado
Decisão do usuário (30/07/2026): **não** é erro e não deve ser sinalizada como
tal. Acontece de verdade — o cliente emite nota para venda fechada fora de
plataforma. Consequências assumidas:

- O motor percorre as **vendas**, então nota órfã não gera linha de
  reconciliação e **nunca aparece no Painel de Erros**. É intencional.
- Ela conta no faturamento e na aba Notas Fiscais, mas cai em "Plataforma/Moeda
  Não Identificada" nos painéis do dashboard.
- Efeito colateral a ter em mente: se o relatório de vendas de um mês **faltar**,
  as notas daquele mês também caem nesse balde e nada acusa a falta. O caminho
  para investigar é clicar na barra "Plataforma Não Identificada".

### Checklist — itens fixos
1. Alterado acumulador para exportação
2. Corrigido erros *(marcável em bloco ou erro por erro; a lista abre embaixo)*
3. Valor total de notas emitidas igual ao emissor
4. Valor total de notas emitidas conferido com Domínio
5. Ajustado acumulador para serviços diferentes *(recebe o selo "Múltiplos
   Serviços Detectados" quando as notas emitidas do mês têm mais de um código
   de serviço)*
6. Ajustado acumulador para vendas fora de plataforma

O estado é salvo em `ChecklistState.itemsJson` (`item1`…`item6` e
`error:<saleId>`).

---

## 7. Interface (design system)

Segue o skill **plano-a-ux**, contexto **Sistema** (fundo `--paper`, cards
brancos, densidade compacta). Tokens em `app/globals.css` via `@theme`.

- **Títulos de aba:** só a inicial maiúscula e **ponto final**, com o ponto em
  menta (`PageTitle`/`PageHeader`). Nada de caixa alta.
- **Cabeçalho de página:** título à esquerda, ação à direita (`PageHeader`).
- **Faixa lateral:** `fixed`, largura `w-64`, altura `h-dvh` — não cresce, não
  encolhe e não rola com o conteúdo. O conteúdo compensa com `ml-64`.
  Contém, nesta ordem: marca → bloco da empresa (código, nome, CNPJ) →
  seletor de competência → abas (Dashboard, Vendas, Notas Fiscais, Produtos,
  Painel de Erros, Checklist, Importações).
- **Botão flutuante** (canto inferior direito): **Mapear** e **Trocar
  Empresa** — ações que não pertencem ao fluxo de conferência saíram do menu.
  Mesmo padrão do botão da tela de empresas.
- **Tabelas:** classes centralizadas em `components/ui/Table.tsx` — cabeçalho em
  caixa alta pequena, divisórias discretas, `hover` em menta na linha.
- **Estados vazios:** `EmptyState` (ícone + o que aconteceu + próximo passo),
  nunca só um texto em itálico.
- **Densidade `sm`:** `Input`/`Select` aceitam `fieldSize="sm"` e `Button` aceita
  `size="sm"`, usados nos balões de filtro. São props, não classes passadas por
  fora — ver a armadilha de CSS no fim desta seção.
- **Filtros:** modal para escolher, **pastilhas** mostrando o que está aplicado
  (clicáveis para remover) e busca com debounce de 350ms — cada tecla dispararia
  uma navegação server-side, já que as telas são `force-dynamic`.
- **Botões:** `primary` (menta, texto petróleo), `solid` (menta escura, **texto
  branco** — usado em Importar Relatório), `ghost`, `danger`.
- **Assinatura da marca:** um único `BrandLockup` serve o painel de empresas
  (`lg`) e a faixa lateral (`md`). O "CONTABILIDADE" copia o site institucional
  (`plano-a-ux`, nav `.brand .name span`): peso **500**, `tracking` .24em, menta,
  e sempre menor que "Plano A". Nem `font-bold` nem `subpixel-antialiased` — os
  dois deixavam a palavra visivelmente diferente do resto da interface.
- **Nome de empresa:** sans, semibold, verde claro (`mint-600` sobre branco,
  `mint-300` sobre petróleo); código em pastilha verde-escura.
- **Busca e filtros em cartão próprio:** `FilterBar` já renderiza o seu próprio
  `Card`, separado do card da tabela (Vendas, Notas Fiscais, Produtos e Painel de
  Erros). Dentro do card da tabela ela virava uma faixa de fundo tingido colada
  no cabeçalho, e busca, contagem e dados pareciam um bloco único.
- **Balão de filtros:** cada campo é nomeado por um `FieldCaption` com o nome da
  dimensão, derivado do rótulo neutro (`"Todas as Plataformas"` → `Plataformas`)
  para não declarar o mesmo nome duas vezes em cada tela. Sem isso o balão é uma
  pilha de caixas iguais cuja única pista é um texto comprido dentro do próprio
  campo.
- **Alinhamento de elementos flutuantes:** a pastilha de contagem à esquerda fica
  dentro de uma faixa `h-14` (a altura do botão flutuante) e centrada nela —
  alinhar as duas só por `bottom-6` deixa a pastilha, mais baixa, visivelmente
  acima do botão.
- **Card de empresa:** lápis no canto superior direito abre a edição do cadastro
  (`CompanyForm`, o mesmo formulário do cadastro novo). O botão é **irmão** do
  `<Link>`, nunca filho — botão dentro de `<a>` é HTML inválido e o clique
  abriria a empresa em vez de editar.
- **Gráfico de barras horizontais:** a largura do eixo de rótulos é fixada por
  `afterFit` a partir do rótulo mais longo. O Chart.js dimensiona o eixo pelo
  espaço que sobra e **corta** o texto que não cabe (era o que comia o começo de
  "Plataforma Não Identificada").
- **Botão flutuante de ações:** abre no **hover**, em CSS puro
  (`components/ui/Fab.tsx`) — sem estado em React, então não fica preso aberto
  depois de navegar. O respiro entre menu e botão é `padding`, não `gap`, senão
  o cursor atravessa uma faixa morta e o menu fecha.
- **Tooltip de texto truncado:** `HoverTooltip` desenha o balão via portal no
  `document.body`. Dentro da tabela não funcionaria: o contêiner de rolagem
  horizontal recorta filhos absolutos.

### Armadilha de CSS: largura em Input/Select
`Input`/`Select` já trazem `w-full`. Passar `w-36` no `className` **não**
sobrescreve — quem vence é a classe que aparece depois na folha de estilo
gerada, e `w-full` vem depois de `w-36`. Combinado com `shrink-0`, isso fez o
select da etapa de Status ocupar a linha inteira e esmagar o rótulo em uma letra
por linha. **Ponha a largura num invólucro** (`<div className="w-44 shrink-0">`),
nunca no `className` do campo.

Cores por função: menta = ação/positivo · teal = informativo · clay = atenção ·
`#C0453B` = erro real. Menta é **acento**, não fundo.

---

## 8. Exportações

| Rota | Conteúdo |
|---|---|
| `export/sales` | vendas em XLSX |
| `export/invoices` | notas em XLSX |
| `export/reconciliation` | análise completa venda × nota |
| `export/checklist-pdf` | relatório de fechamento em PDF |

"Exportar Dados Brutos" fica no cabeçalho de todas as abas que exportam.

---

## 9. Armadilhas conhecidas

- **Banco único.** Local, Preview e Production usam o **mesmo** Postgres no Neon,
  com dados reais de clientes. Nada de `migrate reset`, `db push --force-reset`
  ou `--accept-data-loss`.
- **Excluir empresa apaga tudo em cascata** (vendas, notas, importações). Excluir
  lote apaga as linhas que ele gerou.
- **Reanalisar** aplica o mapeamento **atual** ao lote — é o que faz uma edição
  de mapeamento surtir efeito sobre o que já foi importado.
- **`SituacaoConferencia` nova** exige quatro lugares: o type em
  `reconciliation/types.ts`, o rótulo e o tom em `labels.ts`, o `classify` e o
  enum do Prisma + migration (`ALTER TYPE ... ADD VALUE`).
- **`SituacaoNf`/`SituacaoVenda` nova** exige **cinco**: o type em
  `mapping/types.ts`, rótulo/tom em `labels.ts`, as opções do assistente em
  `wizard/statusFields.ts`, o **enum do zod** em `validation/schemas.ts` e o enum
  do Prisma + migration. Esquecer o zod é silencioso na interface e só estoura ao
  salvar o mapeamento — foi o que aconteceu com `PENDENTE`.
- **Campo novo de mapeamento** exige quatro lugares: o type em
  `mapping/types.ts` (nas `*Mappings` **e** na `Mapped*Row`), a extração em
  `mapSaleRow`/`mapInvoiceRow`, o zod em `validation/schemas.ts`, a lista do
  assistente em `wizard/statusFields.ts` — e o repasse no `MappingWizard`, que
  monta o objeto `mappings` campo por campo. Quem **lê** a nova coluna precisa
  usar `?? ""`: lote importado antes do campo existir não a tem no `rawContent`,
  e reanalisar não a inventa.
- **Editar cadastro de empresa** (código, nome, CNPJ) não mexe em dado nenhum
  importado: vendas, notas, importações e checklists são vinculados pelo `id`,
  não pelo código.
- **Layout do Next fica em cache no cliente e não re-renderiza ao navegar.** A
  faixa lateral (competências, nome da empresa) vem do layout, então toda
  mutação que a afete precisa de `router.refresh()` no cliente ou
  `revalidatePath(..., "layout")` no servidor. Sem isso a pessoa precisa
  recarregar a página na mão — foi o caso do seletor de competência após
  importar.
- **Next 16 tem quebras de compatibilidade.** Antes de escrever código, consulte
  `node_modules/next/dist/docs/` (ver `AGENTS.md`). `params` e `searchParams` são
  Promises; layouts não veem pathname nem searchParams.
