import { db } from "@/lib/db";
import { empresaExiste } from "@/lib/diario/acessorias";

/**
 * Liga o **Validador de Emissões** ao **Diário do Cliente**, nos dois sentidos.
 *
 * O vínculo é o **CNPJ**, e não um cadastro à parte: o Validador guarda
 * `Company.cnpj` e o Diário é chaveado pelos dígitos do `Identificador` do
 * Acessórias. Casar por esse dado é o que torna a ligação **automática** —
 * cliente novo em qualquer um dos dois lados passa a ter o atalho assim que
 * existir no outro, sem ninguém configurar nada.
 *
 * Normalizar para dígitos não é detalhe: das 84 empresas do Validador, 78
 * guardam o CNPJ pontuado (`12.345.678/0001-90`) e uma punhado guarda lixo de
 * um caractere só. Comparar texto cru não casaria quase nada.
 *
 * Quando não há par dos dois lados, as funções devolvem `null` e **nenhum
 * atalho aparece** — em vez de um link que leva a uma tela vazia.
 */

const soDigitos = (v: string | null | undefined) => (v ?? "").replace(/\D/g, "");

/** CNPJ tem 14 dígitos e CPF 11. Qualquer coisa fora disso é cadastro incompleto
 *  e não serve para casar — sem esta guarda, empresas com o campo vazio ou com
 *  um caractere casariam entre si. */
const documentoValido = (d: string) => d.length === 14 || d.length === 11;

/**
 * A empresa do Validador que corresponde a esta chave do Diário.
 *
 * A comparação é feita no banco, normalizando os dois lados, porque o CNPJ está
 * gravado pontuado na maioria das linhas.
 *
 * Há CNPJ repetido entre empresas (3 casos hoje, de 84). Nesse caso vai a de
 * menor código — a mesma ordem da tela de empresas, para que o atalho leve
 * sempre à mesma e não a uma escolhida ao acaso pelo banco.
 */
export async function companyIdPorChave(chave: string): Promise<string | null> {
  const doc = soDigitos(chave);
  if (!documentoValido(doc)) return null;

  try {
    const linhas = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Company"
      WHERE regexp_replace(cnpj, '[^0-9]', '', 'g') = ${doc}
      ORDER BY codigo ASC
      LIMIT 1`;
    return linhas[0]?.id ?? null;
  } catch {
    // O atalho é conveniência: se a consulta falhar, a ficha do cliente continua
    // abrindo normalmente, só sem o botão.
    return null;
  }
}

/**
 * A chave do Diário para uma empresa do Validador, se ela estiver na carteira
 * do Acessórias.
 *
 * Pergunta pela **empresa**, não pela carteira. A primeira versão usava a lista
 * completa, e como ela custa segundos quando o cache está frio (e na Vercel cada
 * instância tem o seu), isso pesava em toda página aberta dentro de uma empresa
 * do Validador. `empresaExiste` aproveita o cache quando ele está quente e cai
 * para uma única requisição quando não está.
 */
export async function chaveDiarioDaEmpresa(cnpj: string): Promise<string | null> {
  const doc = soDigitos(cnpj);
  if (!documentoValido(doc)) return null;

  try {
    return (await empresaExiste(doc)) ? doc : null;
  } catch {
    // Acessórias fora do ar não pode derrubar o Validador: sem resposta, o item
    // do Diário simplesmente não aparece na faixa lateral.
    return null;
  }
}
