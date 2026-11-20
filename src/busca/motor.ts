/**
 * Motor de busca offline dos guias.
 *
 * Arquivo autossuficiente (só imports de pacotes e `import type`) para rodar
 * tanto no app quanto nos testes do Node (`npm test`).
 *
 * Pipeline de cada palavra (indexação e consulta):
 *   1. tokenização preservando posições (para destacar trechos)
 *   2. stopwords removidas ("como", "de", "para"...)
 *   3. formas indexadas: palavra crua sem acento + radical
 *      (singular RSLP → stemmer Snowball português → sem acento)
 *
 * Ranking: BM25 (MiniSearch) com peso por campo, prefixo enquanto digita,
 * tolerância a erros de digitação e expansão por sinônimos. Um segundo índice,
 * por passo, encontra o trecho exato onde a busca aparece.
 */
import { stemmer } from '@orama/stemmers/portuguese';
import { stopwords } from '@orama/stopwords/portuguese';
import MiniSearch, { type Query, type SearchOptions, type SearchResult } from 'minisearch';

import type { Categoria, Guia, Passo } from '../conteudo/tipos';

// ---------------------------------------------------------------------------
// Texto
// ---------------------------------------------------------------------------

/** Minúsculas e sem acentos. */
export const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const LETRAS = /[0-9A-Za-zÀ-ÖØ-öø-ÿ]+/g;

type Token = { palavra: string; inicio: number; fim: number };

export function tokenizar(texto: string): Token[] {
  const tokens: Token[] = [];
  for (const m of texto.matchAll(LETRAS)) {
    tokens.push({ palavra: m[0].toLowerCase(), inicio: m.index!, fim: m.index! + m[0].length });
  }
  return tokens;
}

/** "sem" e "não" mudam o sentido da busca ("sem glúten"), então ficam. */
const MANTIDAS = new Set(['sem', 'nao']);
/** Palavras de pergunta e formas coloquiais que a lista padrão não tem. */
const STOPWORDS_EXTRAS = ['quanto', 'quanta', 'quantos', 'quantas', 'onde', 'porque', 'pq', 'pra', 'pras', 'pro', 'pros', 'q', 'vc'];
const STOPWORDS = new Set([...stopwords.map(normalizar).filter((p) => !MANTIDAS.has(p)), ...STOPWORDS_EXTRAS]);

/**
 * Palavras genéricas de guias: não são exigidas na busca, só somam pontos.
 * "como fazer pão" encontra "Pão caseiro" mesmo sem a palavra "fazer".
 */
const FRACAS = new Set(['fazer', 'faco', 'feito', 'usar', 'utilizar', 'guia', 'jeito', 'maneira', 'forma', 'modo', 'passo', 'dica', 'dicas', 'serve', 'servir']);

/** Plurais que não devem perder o "s". */
const INVARIAVEIS = new Set(['lapis', 'onibus', 'virus', 'tenis', 'pires', 'atlas', 'gas', 'pais', 'cais', 'mes', 'tres', 'bonus', 'oasis', 'freezer', 'gratis', 'simples']);

/** Reduz plurais ao singular (regras do passo de plural do RSLP). */
export function singular(palavra: string): string {
  const p = palavra;
  if (p.length <= 3 || !p.endsWith('s') || INVARIAVEIS.has(normalizar(p))) return p;
  const troca = (sufixo: string, novo: string) => p.slice(0, -sufixo.length) + novo;
  if (p.endsWith('ns')) return troca('ns', 'm'); // bons → bom, jovens → jovem
  if (p.endsWith('ões') || p.endsWith('ães')) return troca('ões', 'ão'); // botões → botão, pães → pão
  if (p.endsWith('ais')) return troca('ais', 'al'); // animais → animal
  if (p.endsWith('éis') || p.endsWith('eis')) return troca('eis', 'el'); // papéis → papel, móveis → móvel
  if (p.endsWith('óis')) return troca('óis', 'ol'); // lençóis → lençol
  if (p.length > 4 && p.endsWith('is')) return troca('is', 'il'); // funis → funil
  if (p.endsWith('res') || p.endsWith('zes') || p.endsWith('les')) return p.slice(0, -2); // flores, luzes, males
  return p.slice(0, -1); // pneus → pneu, pias → pia
}

const cacheRaiz = new Map<string, string>();

/** Radical sem acento, igual para "trocar", "trocando", "troca". */
export function raiz(palavra: string): string {
  let r = cacheRaiz.get(palavra);
  if (r === undefined) {
    // "coloque" → "coloqu" vira "coloc", igual a "colocar" (troque/trocar, fique/ficar).
    r = normalizar(stemmer(singular(palavra))).replace(/qu$/, 'c');
    cacheRaiz.set(palavra, r);
  }
  return r;
}

/** Formas indexadas de uma palavra (vazio para stopwords). */
export function formas(palavra: string): string[] {
  const crua = normalizar(palavra);
  if (STOPWORDS.has(crua)) return [];
  const r = raiz(palavra);
  return r === crua || r.length < 2 ? [crua] : [crua, r];
}

// ---------------------------------------------------------------------------
// Destaque de trechos
// ---------------------------------------------------------------------------

export type Parte = { texto: string; destaque: boolean };

/** Divide o texto marcando as palavras cujas formas estão em `termos`. */
export function destacar(texto: string, termos: Iterable<string>): Parte[] {
  const alvo = termos instanceof Set ? (termos as Set<string>) : new Set(termos);
  const partes: Parte[] = [];
  let pos = 0;
  if (alvo.size) {
    for (const t of tokenizar(texto)) {
      if (!formas(t.palavra).some((f) => alvo.has(f))) continue;
      if (t.inicio > pos) partes.push({ texto: texto.slice(pos, t.inicio), destaque: false });
      partes.push({ texto: texto.slice(t.inicio, t.fim), destaque: true });
      pos = t.fim;
    }
  }
  if (pos < texto.length) partes.push({ texto: texto.slice(pos), destaque: false });
  return partes;
}

/**
 * Recorta uma janela do texto em volta dos destaques. Escolhe a janela que
 * reúne mais palavras distintas encontradas, somando `peso(palavra)` de cada.
 */
function recortar(partes: Parte[], antes = 50, depois = 110, peso: (palavra: string) => number = () => 1): Parte[] {
  const total = partes.reduce((n, p) => n + p.texto.length, 0);
  const destaques: { pos: number; palavra: string }[] = [];
  let pos = 0;
  for (const p of partes) {
    if (p.destaque) destaques.push({ pos, palavra: normalizar(p.texto) });
    pos += p.texto.length;
  }
  let ancora = destaques[0]?.pos ?? 0;
  let melhor = -1;
  for (const d of destaques) {
    const dentro = new Set(destaques.filter((o) => o.pos >= d.pos - antes && o.pos < d.pos + depois).map((o) => o.palavra));
    const valor = [...dentro].reduce((n, w) => n + peso(w), 0);
    if (valor > melhor) {
      melhor = valor;
      ancora = d.pos;
    }
  }
  let ini = Math.max(0, ancora - antes);
  let fim = Math.min(total, ancora + depois);
  const texto = partes.map((p) => p.texto).join('');
  if (ini > 0) ini = texto.indexOf(' ', ini) + 1 || ini; // não corta palavra
  if (fim < total) fim = texto.lastIndexOf(' ', fim) > ini ? texto.lastIndexOf(' ', fim) : fim;

  const saida: Parte[] = [];
  pos = 0;
  for (const p of partes) {
    const a = Math.max(ini, pos);
    const b = Math.min(fim, pos + p.texto.length);
    if (a < b) saida.push({ texto: p.texto.slice(a - pos, b - pos), destaque: p.destaque });
    pos += p.texto.length;
  }
  if (ini > 0) saida.unshift({ texto: '…', destaque: false });
  if (fim < total) saida.push({ texto: '…', destaque: false });
  return saida;
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------

export type Trecho = {
  /** Índice (0-based) do passo onde a busca foi encontrada, se houver. */
  passo?: number;
  /** "Passo N: título do passo", com destaque. */
  rotulo?: Parte[];
  partes: Parte[];
};

export type ResultadoBusca = {
  guia: Guia;
  pontuacao: number;
  titulo: Parte[];
  trecho: Trecho;
  /** Formas que casaram; repasse para a tela do guia destacar. */
  termos: string[];
};

export type RespostaBusca = {
  resultados: ResultadoBusca[];
  /** true quando nenhum guia tinha todas as palavras e a busca foi relaxada. */
  parcial: boolean;
};

type DocGuia = {
  id: string;
  titulo: string;
  tags: string;
  categoria: string;
  categoriaId: string;
  resumo: string;
  materiais: string;
  passosTitulos: string;
  passosTexto: string;
};

type DocPasso = { id: string; guiaId: string; indice: number; titulo: string; texto: string; extras: string };

const PESOS_GUIA = {
  titulo: 5,
  tags: 3,
  categoria: 2,
  resumo: 2,
  materiais: 1.5,
  passosTitulos: 1.5,
  passosTexto: 1,
};

/** Resultados abaixo desta fração da pontuação do primeiro são descartados. */
const CORTE = 0.08;
const CORTE_PARCIAL = 0.15;

/** Textos secundários de um passo: dicas, avisos e a descrição/legenda da imagem. */
const extrasPasso = (p: Passo) => [
  ...(p.dicas ?? []),
  ...(p.avisos ?? []),
  ...(p.imagem ? [p.imagem.descricao, p.imagem.legenda ?? ''] : []),
];

const indexar = (texto: string) => tokenizar(texto).flatMap((t) => formas(t.palavra));

export function criarMotorDeBusca(guias: Guia[], categorias: Categoria[], sinonimos: string[][] = []) {
  const porId = new Map(guias.map((g) => [g.id, g]));
  const nomeCategoria = new Map(categorias.map((c) => [c.id, c.nome]));

  const opcoesBase = {
    tokenize: (texto: string) => [texto],
    processTerm: (texto: string) => indexar(texto),
  };

  const indiceGuias = new MiniSearch<DocGuia>({
    ...opcoesBase,
    fields: Object.keys(PESOS_GUIA),
    storeFields: ['categoriaId'],
  });
  indiceGuias.addAll(
    guias.map((g) => ({
      id: g.id,
      titulo: g.titulo,
      tags: (g.tags ?? []).join(' '),
      categoria: nomeCategoria.get(g.categoria) ?? '',
      categoriaId: g.categoria,
      resumo: g.resumo,
      materiais: (g.materiais ?? []).join(' '),
      passosTitulos: g.passos.map((p) => p.titulo).join(' '),
      passosTexto: g.passos.map((p) => [p.texto, ...extrasPasso(p)].join(' ')).join(' '),
    })),
  );

  const indicePassos = new MiniSearch<DocPasso>({
    ...opcoesBase,
    fields: ['titulo', 'texto', 'extras'],
    storeFields: ['guiaId', 'indice'],
  });
  indicePassos.addAll(
    guias.flatMap((g) =>
      g.passos.map((p, i) => ({
        id: `${g.id}#${i}`,
        guiaId: g.id,
        indice: i,
        titulo: p.titulo,
        texto: p.texto,
        extras: extrasPasso(p).join(' '),
      })),
    ),
  );

  // Sinônimos: forma → formas dos outros termos do grupo.
  const mapaSinonimos = new Map<string, Set<string>>();
  for (const grupo of sinonimos) {
    const formasGrupo = grupo.map((termo) => new Set(indexar(termo)));
    formasGrupo.forEach((proprias, i) => {
      const outras = formasGrupo.filter((_, j) => j !== i).flatMap((s) => [...s]);
      for (const f of proprias) {
        const atual = mapaSinonimos.get(f) ?? new Set<string>();
        outras.forEach((o) => !proprias.has(o) && atual.add(o));
        mapaSinonimos.set(f, atual);
      }
    });
  }

  /** Busca já processada: cada termo é usado como está. */
  const opcoesConsulta: SearchOptions = {
    tokenize: (t) => [t],
    processTerm: (t) => t,
    weights: { fuzzy: 0.4, prefix: 0.5 },
  };

  /** Consulta de uma palavra: OR das formas + sinônimos. */
  function consultaPalavra(palavra: string, ultima: boolean): Query | undefined {
    const [crua, r] = formas(palavra);
    if (!crua) return undefined;
    const queries: Query[] = [
      // Palavra como digitada; prefixo na última (o usuário ainda está digitando).
      { queries: [crua], prefix: ultima || crua.length >= 4, fuzzy: crua.length >= 5 ? 0.2 : false },
    ];
    if (r) queries.push({ queries: [r], prefix: ultima, fuzzy: r.length >= 5 ? 0.2 : false });
    const sin = new Set([...(mapaSinonimos.get(crua) ?? []), ...(r ? (mapaSinonimos.get(r) ?? []) : [])]);
    // Sinônimos valem um pouco menos que a palavra digitada.
    if (sin.size) queries.push({ queries: [...sin], combineWith: 'OR', boostTerm: () => 0.7, prefix: false, fuzzy: false });
    return { queries, combineWith: 'OR' };
  }

  function buscar(consulta: string, filtro: { categoria?: string; limite?: number } = {}): RespostaBusca {
    const { categoria, limite = 50 } = filtro;
    const filtrar = categoria ? (r: SearchResult) => r.categoriaId === categoria : undefined;

    const tokens = tokenizar(consulta);
    const fortes: Query[] = [];
    const fracas: Query[] = [];
    tokens.forEach((t, i) => {
      const q = consultaPalavra(t.palavra, i === tokens.length - 1 && !/\s$/.test(consulta));
      if (!q) return;
      (FRACAS.has(normalizar(t.palavra)) ? fracas : fortes).push(q);
    });

    // Sem termos úteis: lista tudo (respeitando o filtro).
    if (!fortes.length && !fracas.length) {
      const todos = guias.filter((g) => !categoria || g.categoria === categoria);
      return {
        parcial: false,
        resultados: todos.slice(0, limite).map((guia) => ({
          guia,
          pontuacao: 0,
          titulo: [{ texto: guia.titulo, destaque: false }],
          trecho: { partes: [{ texto: guia.resumo, destaque: false }] },
          termos: [],
        })),
      };
    }

    const executar = (queries: Query[], combineWith: 'AND' | 'OR') =>
      indiceGuias.search({ queries, combineWith }, { ...opcoesConsulta, boost: PESOS_GUIA, filter: filtrar });

    let parcial = false;
    let principais: SearchResult[];
    if (fortes.length) {
      principais = executar(fortes, 'AND');
      if (!principais.length && fortes.length > 1) {
        principais = executar(fortes, 'OR');
        parcial = principais.length > 0;
      }
    } else {
      principais = executar(fracas, 'OR');
    }

    // Palavras fracas somam pontos, mas não eliminam resultados.
    if (fortes.length && fracas.length && principais.length) {
      const bonus = new Map(executar(fracas, 'OR').map((r) => [r.id, r.score]));
      principais = principais
        .map((r) => ({ ...r, score: r.score + 0.5 * (bonus.get(r.id) ?? 0) }))
        .sort((a, b) => b.score - a.score);
    }

    // Corta a cauda de resultados fracos (em geral, só um "quase igual" por
    // tolerância a erro, como "senão" para "senha").
    if (principais.length) {
      const minimo = principais[0].score * (parcial ? CORTE_PARCIAL : CORTE);
      principais = principais.filter((r) => r.score >= minimo);
    }

    const todasQueries = [...fortes, ...fracas];
    const resultados = principais.slice(0, limite).map((r): ResultadoBusca => {
      const guia = porId.get(r.id as string)!;
      const termos = new Set(r.terms);

      // Melhor passo deste guia para mostrar o trecho.
      const passos = indicePassos.search(
        { queries: todasQueries, combineWith: 'OR' },
        { ...opcoesConsulta, boost: { titulo: 2, texto: 1, extras: 0.7 }, filter: (p) => p.guiaId === guia.id },
      );
      passos.forEach((p) => p.terms.forEach((t) => termos.add(t)));

      const titulo = destacar(guia.titulo, termos);
      const resumo = destacar(guia.resumo, termos);
      // Termos já visíveis no título ou no resumo (comparando pelo radical).
      const formasVisiveis = new Set(
        [...tokenizar(guia.titulo), ...tokenizar(guia.resumo)].flatMap((t) => formas(t.palavra)),
      );
      const visivel = (termo: string) => formasVisiveis.has(termo) || formasVisiveis.has(raiz(termo));
      const melhor = passos[0];
      let trecho: Trecho = { partes: resumo };
      // Mostra o passo quando ele traz algo que título e resumo não mostram.
      if (melhor && (melhor.terms.some((t) => !visivel(t)) || !resumo.some((p) => p.destaque))) {
        const passo = guia.passos[melhor.indice as number];
        // Trecho em uma linha só: parágrafos viram espaços.
        const corpo = [passo.texto, ...extrasPasso(passo)].join(' ').replace(/\s+/g, ' ');
        const partesCorpo = destacar(corpo, termos);
        trecho = {
          passo: melhor.indice as number,
          rotulo: [{ texto: `Passo ${(melhor.indice as number) + 1}: `, destaque: false }, ...destacar(passo.titulo, termos)],
          // Sem destaque no corpo (casou só o título do passo): mostra o início.
          // Prioriza a janela com termos que o título e o resumo não mostram.
          partes: recortar(partesCorpo, partesCorpo.some((p) => p.destaque) ? 50 : 0, 110, (w) => (visivel(w) ? 1 : 3)),
        };
      }

      return { guia, pontuacao: r.score, titulo, trecho, termos: [...termos] };
    });

    return { resultados, parcial };
  }

  return { buscar };
}

export type MotorDeBusca = ReturnType<typeof criarMotorDeBusca>;
