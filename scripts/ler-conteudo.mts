// Lê e valida a pasta conteudo/ no Node. Usado por validar-conteudo.mts e pelos testes.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { lerJson, montarConteudo, type ConteudoMontado } from '../src/conteudo/montar.ts';
import { EXTENSOES_IMAGEM } from '../src/conteudo/validar.ts';

export const PASTA_CONTEUDO = join(import.meta.dirname, '..', 'conteudo');

export type ConteudoLido = ConteudoMontado & {
  /** Total de arquivos .json em guias/, válidos ou não. */
  totalArquivos: number;
  /** Caminhos das imagens em imagens/ (ex.: "guia/foto.png"). */
  imagens: string[];
};

export function lerConteudo(raiz = PASTA_CONTEUDO): ConteudoLido {
  const errosLeitura: string[] = [];
  const ler = (relativo: string) =>
    existsSync(join(raiz, relativo)) ? lerJson(readFileSync(join(raiz, relativo), 'utf8'), relativo, errosLeitura) : undefined;

  const pastaImagens = join(raiz, 'imagens');
  const imagens = existsSync(pastaImagens)
    ? readdirSync(pastaImagens, { recursive: true, encoding: 'utf8' })
        .map((f) => f.split(sep).join('/'))
        .filter((f) => EXTENSOES_IMAGEM.test(f))
        .sort()
    : [];

  const arquivos = readdirSync(join(raiz, 'guias')).filter((f) => f.endsWith('.json'));
  const guias = arquivos
    .map((f) => ({ nome: `guias/${f}`, dados: ler(`guias/${f}`) }))
    .filter((g) => g.dados !== undefined);

  const montado = montarConteudo({
    categorias: ler('categorias.json'),
    sinonimos: ler('sinonimos.json'),
    guias,
    imagens,
    errosLeitura,
  });
  return { ...montado, totalArquivos: arquivos.length, imagens };
}
