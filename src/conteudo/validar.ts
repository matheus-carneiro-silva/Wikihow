/**
 * Validação do conteúdo JSON. Sem dependências e sem imports com alias para
 * poder ser usado tanto pelo app quanto por `npm run conteudo:validar` (Node).
 */
import type { Categoria, Guia } from './tipos';

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const DIFICULDADES = ['facil', 'media', 'dificil'];

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const ehTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const ehListaDeTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every(ehTexto);

function verificarChaves(obj: Record<string, unknown>, permitidas: string[], local: string, erros: string[]) {
  for (const chave of Object.keys(obj)) {
    if (chave !== '$schema' && !permitidas.includes(chave)) erros.push(`${local}: campo desconhecido "${chave}"`);
  }
}

export function validarCategorias(dados: unknown): string[] {
  const erros: string[] = [];
  if (!Array.isArray(dados)) return ['categorias.json: deve ser uma lista'];
  const ids = new Set<string>();
  dados.forEach((c, i) => {
    const local = `categorias.json[${i}]`;
    if (!ehObjeto(c)) return void erros.push(`${local}: deve ser um objeto`);
    verificarChaves(c, ['id', 'nome', 'descricao'], local, erros);
    if (!ehTexto(c.id) || !ID.test(c.id)) erros.push(`${local}.id: use kebab-case (ex.: "casa-e-jardim")`);
    else if (ids.has(c.id)) erros.push(`${local}.id: "${c.id}" repetido`);
    else ids.add(c.id);
    if (!ehTexto(c.nome)) erros.push(`${local}.nome: obrigatório`);
    if (c.descricao !== undefined && !ehTexto(c.descricao)) erros.push(`${local}.descricao: deve ser texto`);
  });
  return erros;
}

export function validarSinonimos(dados: unknown): string[] {
  const erros: string[] = [];
  if (!Array.isArray(dados)) return ['sinonimos.json: deve ser uma lista de grupos'];
  dados.forEach((grupo, i) => {
    const local = `sinonimos.json[${i}]`;
    if (!Array.isArray(grupo) || grupo.length < 2) return void erros.push(`${local}: grupo com ao menos 2 palavras`);
    grupo.forEach((p, j) => {
      if (!ehTexto(p) || /\s/.test(p.trim())) erros.push(`${local}[${j}]: uma palavra só, sem espaços`);
    });
  });
  return erros;
}

export function validarGuia(dados: unknown, arquivo: string, categorias: Categoria[]): string[] {
  const erros: string[] = [];
  if (!ehObjeto(dados)) return [`${arquivo}: deve ser um objeto`];
  const g = dados as Partial<Record<keyof Guia, unknown>> & Record<string, unknown>;
  verificarChaves(
    g,
    ['id', 'titulo', 'resumo', 'categoria', 'tags', 'dificuldade', 'tempoMinutos', 'atualizadoEm', 'materiais', 'passos'],
    arquivo,
    erros,
  );

  const idEsperado = arquivo.replace(/^.*\//, '').replace(/\.json$/, '');
  if (g.id !== idEsperado) erros.push(`${arquivo}.id: deve ser "${idEsperado}" (igual ao nome do arquivo)`);
  if (!ID.test(idEsperado)) erros.push(`${arquivo}: nome do arquivo deve ser kebab-case`);
  if (!ehTexto(g.titulo)) erros.push(`${arquivo}.titulo: obrigatório`);
  if (!ehTexto(g.resumo)) erros.push(`${arquivo}.resumo: obrigatório`);
  if (!ehTexto(g.categoria)) erros.push(`${arquivo}.categoria: obrigatório`);
  else if (!categorias.some((c) => c.id === g.categoria))
    erros.push(`${arquivo}.categoria: "${g.categoria}" não existe em categorias.json`);
  if (g.tags !== undefined && !ehListaDeTextos(g.tags)) erros.push(`${arquivo}.tags: lista de textos`);
  if (g.dificuldade !== undefined && !DIFICULDADES.includes(g.dificuldade as string))
    erros.push(`${arquivo}.dificuldade: use ${DIFICULDADES.join(', ')}`);
  if (g.tempoMinutos !== undefined && !(Number.isInteger(g.tempoMinutos) && (g.tempoMinutos as number) > 0))
    erros.push(`${arquivo}.tempoMinutos: inteiro positivo`);
  if (!ehTexto(g.atualizadoEm) || !DATA.test(g.atualizadoEm) || Number.isNaN(Date.parse(g.atualizadoEm)))
    erros.push(`${arquivo}.atualizadoEm: data AAAA-MM-DD`);
  if (g.materiais !== undefined && !ehListaDeTextos(g.materiais)) erros.push(`${arquivo}.materiais: lista de textos`);

  if (!Array.isArray(g.passos) || g.passos.length === 0) {
    erros.push(`${arquivo}.passos: lista com ao menos um passo`);
  } else {
    g.passos.forEach((p, i) => {
      const local = `${arquivo}.passos[${i}]`;
      if (!ehObjeto(p)) return void erros.push(`${local}: deve ser um objeto`);
      verificarChaves(p, ['titulo', 'texto', 'dicas', 'avisos'], local, erros);
      if (!ehTexto(p.titulo)) erros.push(`${local}.titulo: obrigatório`);
      if (!ehTexto(p.texto)) erros.push(`${local}.texto: obrigatório`);
      if (p.dicas !== undefined && !ehListaDeTextos(p.dicas)) erros.push(`${local}.dicas: lista de textos`);
      if (p.avisos !== undefined && !ehListaDeTextos(p.avisos)) erros.push(`${local}.avisos: lista de textos`);
    });
  }
  return erros;
}
