'use strict';

// Quando esta tela é aberta dentro do HUB Fiscal, ela vira o conteúdo de um
// iframe. O HUB roda na Vercel e não pode hospedar a extração — ela precisa do
// Chrome com interface, do repositório de certificados do Windows e deste
// processo vivo segurando os documentos em memória. Então o HUB emoldura o
// agente local em vez de reimplementá-lo, e existe **uma** interface só.
//
// Como o documento do iframe tem origem `localhost`, as chamadas de API daqui
// continuam sendo mesma origem: nenhuma política de rede privada do navegador
// entra no caminho.
//
// Este arquivo é a única parte da interface que sabe que a moldura existe.

(function () {
  if (window.parent === window) return; // Aberta direto no navegador: nada muda.

  document.documentElement.classList.add('embutido');

  /** O aceno é o que diz ao HUB que o agente está no ar. Iframe com conexão
   *  recusada não dispara `onerror`, então a presença tem de ser **afirmada**
   *  por aqui — o HUB não tem como inferi-la. */
  /** A versão vai junto no aceno: com a ferramenta instalada em várias máquinas
   *  passam a existir várias cópias, e o HUB — que é sempre o mais novo, porque
   *  está na Vercel — é quem consegue avisar quem ficou para trás. */
  var versao = '';

  function acenar(altura) {
    // Alvo `*`: não dá para saber de antemão em que domínio o HUB está servido
    // (produção, preview ou localhost). A mensagem carrega o nome do agente, a
    // versão e uma altura — nenhum dado fiscal — então não há o que vazar. Quem
    // confere a origem é o HUB, ao receber.
    parent.postMessage({ agente: 'emissor-nacional', versao: versao, altura: altura }, '*');
  }

  /**
   * Mede **só o conteúdo** — nunca `documentElement`.
   *
   * O HUB aplica no iframe a altura que sai daqui, e isso vira a viewport deste
   * documento. `documentElement.scrollHeight` nunca é menor que a viewport, ou
   * seja: mediríamos de volta o número que acabamos de mandar. A altura passaria
   * a só crescer, e sobraria papel em branco embaixo quando a tabela encolhesse.
   *
   * `body` não tem altura ligada à viewport (nada de `height:100%`), então o
   * retângulo dele é o conteúdo e mais nada. As margens são zeradas no reset,
   * então não há margem de filho escapando da conta.
   */
  function alturaAtual() {
    return Math.ceil(document.body.getBoundingClientRect().height);
  }

  let ultima = 0;
  function sincronizar() {
    const altura = alturaAtual();
    // Só avisa quando muda de verdade: a tabela de notas redesenha bastante, e
    // uma mensagem por pixel faria o HUB re-renderizar sem parar.
    if (Math.abs(altura - ultima) < 8) return;
    ultima = altura;
    acenar(altura);
  }

  // O primeiro aceno sai imediatamente, antes de fontes e imagens: o HUB está
  // com um relógio correndo, e esperar `load` gastaria segundos à toa. A versão
  // chega depois e vai no aceno seguinte — descobrir a versão não pode atrasar o
  // sinal de "estou vivo".
  acenar(alturaAtual());
  window.addEventListener('load', sincronizar);

  fetch('/api/sessao')
    .then(function (r) { return r.json(); })
    .then(function (s) {
      versao = s.versao || '';
      acenar(alturaAtual());
    })
    .catch(function () { /* sem versão o HUB só não consegue avisar de desatualização */ });

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(sincronizar).observe(document.body);
  } else {
    setInterval(sincronizar, 1000);
  }
})();
