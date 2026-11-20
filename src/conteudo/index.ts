import type { Categoria, Guia } from './tipos';
import { validarCategorias, validarGuia } from './validar';

export type { Categoria, Dificuldade, Guia, Passo } from './tipos';

// Todo o conteúdo entra no bundle: o app funciona 100% offline.
const dadosCategorias: unknown = require('../../conteudo/categorias.json');
const arquivosGuias = require.context('../../conteudo/guias', false, /\.json$/);

function carregar() {
  const erros = validarCategorias(dadosCategorias);
  const categorias = erros.length ? [] : (dadosCategorias as Categoria[]);

  const guias: Guia[] = [];
  for (const chave of arquivosGuias.keys()) {
    const dados: unknown = arquivosGuias(chave);
    const errosGuia = validarGuia(dados, chave.replace(/^\.\//, 'guias/'), categorias);
    if (errosGuia.length) erros.push(...errosGuia);
    else guias.push(dados as Guia);
  }

  if (erros.length) {
    const mensagem = `Conteúdo inválido:\n- ${erros.join('\n- ')}`;
    // Em desenvolvimento, falha alto; em build, ignora só os guias inválidos.
    if (__DEV__) throw new Error(mensagem);
    console.warn(mensagem);
  }

  guias.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm) || a.titulo.localeCompare(b.titulo));
  return { categorias, guias };
}

export const { categorias, guias } = carregar();

const porId = new Map(guias.map((g) => [g.id, g]));

export const obterGuia = (id: string) => porId.get(id);
export const obterCategoria = (id: string) => categorias.find((c) => c.id === id);

/** Minúsculas e sem acentos, para busca ("cafe" encontra "Café"). */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function buscarGuias(termo: string, categoria?: string): Guia[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  return guias.filter((g) => {
    if (categoria && g.categoria !== categoria) return false;
    if (!palavras.length) return true;
    const alvo = normalizar([g.titulo, g.resumo, ...(g.tags ?? []), ...g.passos.map((p) => p.titulo)].join(' '));
    return palavras.every((p) => alvo.includes(p));
  });
}

export const NOMES_DIFICULDADE = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' } as const;
