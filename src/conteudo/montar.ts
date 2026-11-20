/**
 * Monta o conteúdo a partir dos arquivos já lidos, validando tudo. Usado pelo
 * conteúdo embutido no APK, pelo conteúdo baixado do GitHub e pelos scripts do
 * Node, para que as três origens passem exatamente pelas mesmas regras.
 *
 * Sem dependências e sem imports com alias (roda no app e no Node).
 */
import type { Categoria, Guia } from './tipos.ts';
import { validarCategorias, validarGuia, validarSinonimos } from './validar.ts';

/** Arquivos de uma pasta de conteúdo, já lidos (JSON em objeto). */
export type FonteConteudo = {
  /** Conteúdo de categorias.json; undefined se ausente ou ilegível. */
  categorias: unknown;
  /** Conteúdo de sinonimos.json; undefined se ausente (vira lista vazia). */
  sinonimos: unknown;
  /** Cada guia com o nome relativo ("guias/<id>.json"). */
  guias: { nome: string; dados: unknown }[];
  /** Caminhos das imagens dentro de imagens/ ("<guia>/<arquivo>.png"). */
  imagens: string[];
  /** Erros de leitura (ex.: JSON inválido); o arquivo correspondente fica de fora. */
  errosLeitura?: string[];
};

export type ConteudoMontado = {
  categorias: Categoria[];
  sinonimos: string[][];
  /** Só os guias válidos, dos atualizados mais recentemente para os mais antigos. */
  guias: Guia[];
  erros: string[];
};

export function montarConteudo(fonte: FonteConteudo): ConteudoMontado {
  const erros = [...(fonte.errosLeitura ?? [])];
  const jaReportado = (arquivo: string) => erros.some((e) => e.startsWith(arquivo));

  let categorias: Categoria[] = [];
  if (fonte.categorias === undefined) {
    if (!jaReportado('categorias.json')) erros.push('categorias.json: arquivo ausente');
  } else {
    const errosCategorias = validarCategorias(fonte.categorias);
    erros.push(...errosCategorias);
    if (!errosCategorias.length) categorias = fonte.categorias as Categoria[];
  }

  let sinonimos: string[][] = [];
  if (fonte.sinonimos !== undefined) {
    const errosSinonimos = validarSinonimos(fonte.sinonimos);
    erros.push(...errosSinonimos);
    if (!errosSinonimos.length) sinonimos = fonte.sinonimos as string[][];
  }

  const imagens = new Set(fonte.imagens);
  const guias: Guia[] = [];
  for (const { nome, dados } of fonte.guias) {
    const errosGuia = validarGuia(dados, nome, categorias, imagens);
    erros.push(...errosGuia);
    if (!errosGuia.length) guias.push(dados as Guia);
  }
  guias.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm) || a.titulo.localeCompare(b.titulo));

  return { categorias, sinonimos, guias, erros };
}

/** Lê um JSON, registrando o erro em `erros` (e devolvendo undefined) se for inválido. */
export function lerJson(texto: string, nome: string, erros: string[]): unknown {
  try {
    return JSON.parse(texto);
  } catch (e) {
    erros.push(`${nome}: JSON inválido (${(e as Error).message})`);
    return undefined;
  }
}
