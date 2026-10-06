# Extrator do Emissor Nacional

## Faça isto uma vez

Dois cliques em **Instalar - iniciar com o Windows.bat**.

A partir daí o extrator sobe sozinho toda vez que você liga o computador, sem
janela nenhuma aparecendo, e a aba **Extrair notas do Emissor Nacional** do Hub
Fiscal simplesmente funciona. Você não abre mais nada.

Para desfazer, dois cliques em **Desinstalar - nao iniciar com o Windows.bat**.

## Se preferir abrir na mão

Dois cliques em **Iniciar extrator.bat**. Aí a janela preta precisa ficar aberta —
fechar ela encerra a ferramenta, e as notas carregadas saem da memória junto.
Nada fica gravado nesta pasta.

## O que esta ferramenta precisa

- Windows (qualquer navegador serve; nenhum é obrigatório)
- O certificado digital da empresa instalado **neste computador**, no seu usuário

Não precisa instalar Node, nem npm, nem Chrome. Tudo vai dentro da pasta.

## Para fechar

Dois cliques em **Fechar extrator.bat**.

Se você abriu pelo *Iniciar extrator.bat*, fechar a janela preta também serve. Mas
se ele sobe junto com o Windows, não existe janela nenhuma para fechar — é para
isso que o *Fechar* existe.

## Se aparecer "o extrator já está aberto"

Ele já está rodando. Abra <http://localhost:3777> — é a janela que já existe.

## O que é a pasta `node`

É o motor. O extrator é escrito em JavaScript, e `node\node.exe` é o programa que
executa esse código — vai junto na pasta justamente para ninguém precisar instalar
nada. São 92 MB, e é o arquivo mais pesado daqui.

**Não apague e não mexa.** E é ele que explica o item seguinte.

## Atualização

1. **Feche primeiro** (Fechar extrator.bat).
2. Substitua a pasta pela nova.
3. Abra de novo, ou reinicie o computador se ele sobe sozinho.

Pular o passo 1 dá errado de dois jeitos, e os dois enganam:

- O Windows **não deixa** apagar a pasta `node`, porque o `node.exe` dela está em
  uso. Parece falta de permissão; é só o programa aberto.
- Se você substituir só o resto e deixar o `node` para lá, a pasta fica nova mas
  **o programa que está rodando continua sendo o antigo** — ele foi carregado para
  a memória quando abriu. Tudo parece atualizado e nada mudou.

Para conferir qual versão está no ar: <http://localhost:3777/api/sessao>.
