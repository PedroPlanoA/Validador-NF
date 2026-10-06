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

**Você não precisa fazer nada.**

Toda vez que o extrator abre, ele pergunta ao Hub Fiscal se existe versão nova.
Se existir, baixa, troca e reinicia sozinho — leva poucos segundos e acontece
antes de a tela aparecer. Não há pasta para substituir e não há zip para pedir.

Só o código é trocado. A pasta `node` fica onde está, e é por isso que isto
funciona mesmo com o extrator aberto.

Se o Hub estiver fora do ar ou a internet cair, ele abre normalmente com a versão
que já está instalada. Nunca deixa de abrir por causa de atualização.

E se a versão nova não subir, ele devolve a anterior e volta a funcionar com ela.

Para ver em que versão você está: <http://localhost:3777/api/sessao>.
