/**
 * Conteúdo embutido no APK no momento do build (pasta conteudo/ do repositório).
 * É o ponto de partida do app: funciona offline desde a instalação, antes da
 * primeira sincronização com o GitHub.
 */
import { montarConteudo, type FonteConteudo } from './montar';

const contextoGuias = require.context('../../conteudo/guias', false, /\.json$/);
const contextoImagens = require.context('../../conteudo/imagens', true, /\.(png|jpe?g|webp)$/i);

const semPrefixo = (chave: string) => chave.replace(/^\.\//, '');

/** Caminho dentro de imagens/ → asset do Metro. */
const imagens = new Map<string, number>(contextoImagens.keys().map((k) => [semPrefixo(k), contextoImagens(k) as number]));

const fonte: FonteConteudo = {
  categorias: require('../../conteudo/categorias.json'),
  sinonimos: require('../../conteudo/sinonimos.json'),
  guias: contextoGuias.keys().map((k) => ({ nome: `guias/${semPrefixo(k)}`, dados: contextoGuias(k) as unknown })),
  imagens: [...imagens.keys()],
};

export const conteudoEmbutido = montarConteudo(fonte);
export const imagemEmbutida = (arquivo: string) => imagens.get(arquivo);
