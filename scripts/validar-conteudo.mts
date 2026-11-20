// Valida conteudo/ fora do app. Uso: npm run conteudo:validar (Node 22.18+).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Categoria } from '../src/conteudo/tipos.ts';
import { validarCategorias, validarGuia } from '../src/conteudo/validar.ts';

const raiz = join(import.meta.dirname, '..', 'conteudo');
const erros: string[] = [];

function lerJson(caminho: string, nome: string): unknown {
  try {
    return JSON.parse(readFileSync(caminho, 'utf8'));
  } catch (e) {
    erros.push(`${nome}: JSON inválido (${(e as Error).message})`);
    return undefined;
  }
}

const categorias = lerJson(join(raiz, 'categorias.json'), 'categorias.json');
erros.push(...validarCategorias(categorias));
const listaCategorias = Array.isArray(categorias) ? (categorias as Categoria[]) : [];

const arquivos = readdirSync(join(raiz, 'guias')).filter((f) => f.endsWith('.json'));
for (const arquivo of arquivos) {
  const nome = `guias/${arquivo}`;
  const dados = lerJson(join(raiz, 'guias', arquivo), nome);
  if (dados !== undefined) erros.push(...validarGuia(dados, nome, listaCategorias));
}

if (erros.length) {
  console.error(`✖ ${erros.length} problema(s):\n- ${erros.join('\n- ')}`);
  process.exit(1);
}
console.log(`✔ ${listaCategorias.length} categoria(s) e ${arquivos.length} guia(s) válidos.`);
