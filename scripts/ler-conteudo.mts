// Lê e valida a pasta conteudo/ no Node. Usado por validar-conteudo.mts e pelos testes.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Categoria, Guia } from '../src/conteudo/tipos.ts';
import { validarCategorias, validarGuia, validarSinonimos } from '../src/conteudo/validar.ts';

export const PASTA_CONTEUDO = join(import.meta.dirname, '..', 'conteudo');

export type ConteudoLido = {
  erros: string[];
  categorias: Categoria[];
  sinonimos: string[][];
  /** Só os guias válidos. */
  guias: Guia[];
  /** Total de arquivos .json em guias/, válidos ou não. */
  totalArquivos: number;
};

export function lerConteudo(raiz = PASTA_CONTEUDO): ConteudoLido {
  const erros: string[] = [];

  const lerJson = (caminho: string, nome: string): unknown => {
    try {
      return JSON.parse(readFileSync(caminho, 'utf8'));
    } catch (e) {
      erros.push(`${nome}: JSON inválido (${(e as Error).message})`);
      return undefined;
    }
  };

  const dadosCategorias = lerJson(join(raiz, 'categorias.json'), 'categorias.json');
  const errosCategorias = dadosCategorias === undefined ? [] : validarCategorias(dadosCategorias);
  erros.push(...errosCategorias);
  const categorias = dadosCategorias !== undefined && !errosCategorias.length ? (dadosCategorias as Categoria[]) : [];

  const dadosSinonimos = lerJson(join(raiz, 'sinonimos.json'), 'sinonimos.json');
  const errosSinonimos = dadosSinonimos === undefined ? [] : validarSinonimos(dadosSinonimos);
  erros.push(...errosSinonimos);
  const sinonimos = dadosSinonimos !== undefined && !errosSinonimos.length ? (dadosSinonimos as string[][]) : [];

  const arquivos = readdirSync(join(raiz, 'guias')).filter((f) => f.endsWith('.json'));
  const guias: Guia[] = [];
  for (const arquivo of arquivos) {
    const nome = `guias/${arquivo}`;
    const dados = lerJson(join(raiz, 'guias', arquivo), nome);
    if (dados === undefined) continue;
    const errosGuia = validarGuia(dados, nome, categorias);
    erros.push(...errosGuia);
    if (!errosGuia.length) guias.push(dados as Guia);
  }

  return { erros, categorias, sinonimos, guias, totalArquivos: arquivos.length };
}
