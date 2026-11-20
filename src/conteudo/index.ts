import { criarMotorDeBusca } from '../busca/motor';
import type { Categoria, Guia } from './tipos';
import { validarCategorias, validarGuia, validarSinonimos } from './validar';

export type { Categoria, Dificuldade, Guia, Passo } from './tipos';

// Todo o conteúdo entra no bundle: o app funciona 100% offline.
const dadosCategorias: unknown = require('../../conteudo/categorias.json');
const dadosSinonimos: unknown = require('../../conteudo/sinonimos.json');
const arquivosGuias = require.context('../../conteudo/guias', false, /\.json$/);

function carregar() {
  const erros = validarCategorias(dadosCategorias);
  const categorias = erros.length ? [] : (dadosCategorias as Categoria[]);
  const errosSinonimos = validarSinonimos(dadosSinonimos);
  erros.push(...errosSinonimos);
  const sinonimos = errosSinonimos.length ? [] : (dadosSinonimos as string[][]);

  const guias: Guia[] = [];
  for (const chave of arquivosGuias.keys()) {
    const dados: unknown = arquivosGuias(chave);
    const errosGuia = validarGuia(dados, chave.replace(/^\.\//, 'guias/'), categorias);
    if (errosGuia.length) erros.push(...errosGuia);
    else guias.push(dados as Guia);
  }

  if (erros.length) {
    const mensagem = `Conteúdo inválido:\n- ${erros.join('\n- ')}`;
    // Em desenvolvimento, falha alto; em build, ignora só o que é inválido.
    if (__DEV__) throw new Error(mensagem);
    console.warn(mensagem);
  }

  guias.sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm) || a.titulo.localeCompare(b.titulo));
  return { categorias, guias, sinonimos };
}

const conteudo = carregar();
export const { categorias, guias } = conteudo;

const porId = new Map(guias.map((g) => [g.id, g]));

export const obterGuia = (id: string) => porId.get(id);
export const obterCategoria = (id: string) => categorias.find((c) => c.id === id);

/** Motor de busca, montado uma vez na abertura do app. */
export const motorDeBusca = criarMotorDeBusca(guias, categorias, conteudo.sinonimos);

export const NOMES_DIFICULDADE = { facil: 'Fácil', media: 'Média', dificil: 'Difícil' } as const;
