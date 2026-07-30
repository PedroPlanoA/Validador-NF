/**
 * Classes do botão flutuante de ações, compartilhadas pela tela de empresas e
 * pelas telas de dentro de uma empresa.
 *
 * O menu abre no hover, sem estado em React. Dois detalhes que fazem isso
 * funcionar de verdade:
 *  - o invólucro do menu usa `bottom-full` + `pb-3`: o respiro visual vem do
 *    padding, que continua fazendo parte da área com hover. Um `gap` de verdade
 *    deixaria uma faixa morta entre menu e botão, e o menu fecharia enquanto o
 *    cursor atravessa.
 *  - `invisible`/`visible` em vez de montar e desmontar: mantém o menu no DOM
 *    para a transição acontecer e para o leitor de tela encontrá-lo.
 *
 * `group-focus-within` mantém tudo acessível por teclado, já que sem mouse não
 * existe hover.
 */
export const FAB_MENU_CLASS =
  "absolute bottom-full right-0 pb-3 invisible opacity-0 translate-y-1 transition-all duration-200 ease-out group-hover:visible group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:translate-y-0";

export const FAB_ITEM_CLASS =
  "w-full text-left px-4 py-2.5 text-sm font-semibold text-ink hover:bg-paper-alt/60 flex items-center gap-2.5 transition-colors";

/** Verde-petróleo em repouso, teal (o outro tom de verde da paleta) no hover. */
export const FAB_BUTTON_CLASS =
  "w-14 h-14 rounded-full bg-deep text-white shadow-card-hover flex items-center justify-center transition-colors duration-300 group-hover:bg-teal outline-none focus-visible:ring-4 focus-visible:ring-mint/40";

/** A engrenagem gira só quando o cursor está sobre o botão. */
export const FAB_ICON_CLASS = "w-6 h-6 transition-transform duration-300 group-hover:rotate-90";
