/**
 * Sincroniza a pasta de conteúdo com o repositório no GitHub.
 *
 * 1. Pergunta à API qual é o commit atual do branch (1 requisição). Se for o
 *    mesmo já baixado, termina aqui.
 * 2. Lista os arquivos da pasta naquele commit, com o hash de cada um.
 * 3. Monta uma pasta temporária: arquivos com hash igual ao já baixado são
 *    copiados do aparelho; os novos ou alterados são baixados.
 * 4. Valida a pasta temporária com as mesmas regras do app. Só se estiver
 *    válida ela substitui o conteúdo atual — um erro no repositório nunca
 *    estraga o que já está no aparelho.
 *
 * Rede e arquivos chegam por parâmetro (`Armazenamento` e `buscar`), então
 * esta lógica roda e é testada no Node sem celular.
 */
import { montarConteudo, type ConteudoMontado, type FonteConteudo } from './montar.ts';

export type ConfigRepositorio = {
  /** "dono/repositorio" */
  repositorio: string;
  branch: string;
  /** Pasta do conteúdo dentro do repositório. */
  pasta: string;
};

/** O que já está no aparelho: commit e hash de cada arquivo. */
export type Manifesto = {
  commit: string;
  /** Data ISO do download. */
  baixadoEm: string;
  /** Caminho relativo à pasta de conteúdo → hash do Git (blob sha). */
  arquivos: Record<string, string>;
};

export type EntradaArvore = { path: string; type: string; sha: string };

/** Acesso aos arquivos do aparelho. Implementado com expo-file-system no app. */
export interface Armazenamento {
  lerManifesto(): Promise<Manifesto | null>;
  /** Cria a pasta temporária vazia (apagando restos de uma tentativa anterior). */
  prepararTemporaria(): Promise<void>;
  /** Copia um arquivo do conteúdo atual para a temporária. */
  copiarParaTemporaria(caminho: string): Promise<void>;
  baixarParaTemporaria(caminho: string, url: string): Promise<void>;
  /** Lê a pasta temporária para validação. */
  lerTemporaria(): Promise<FonteConteudo>;
  /** Grava o manifesto na temporária e a transforma no conteúdo atual. */
  promoverTemporaria(manifesto: Manifesto): Promise<void>;
  descartarTemporaria(): Promise<void>;
}

/** Subconjunto de fetch usado aqui (facilita testar). */
export type Buscar = (
  url: string,
  init?: { headers?: Record<string, string> },
) => Promise<{ ok: boolean; status: number; text(): Promise<string>; json(): Promise<unknown> }>;

export type ResultadoSincronizacao =
  | { tipo: 'sem-mudancas'; commit: string }
  | { tipo: 'atualizado'; commit: string; conteudo: ConteudoMontado; baixados: number; reaproveitados: number }
  | { tipo: 'invalido'; commit: string; erros: string[] };

/** Falha de rede ou da API, com mensagem para mostrar ao usuário. */
export class ErroSincronizacao extends Error {}

/** Arquivos da pasta de conteúdo que o app usa (relativos à pasta). */
const ARQUIVO_DO_APP = /^(categorias\.json|sinonimos\.json|guias\/[^/]+\.json|imagens\/.+\.(png|jpe?g|webp))$/i;

/** Filtra a árvore do repositório: só os arquivos do app, relativos à pasta. */
export function arquivosDoConteudo(arvore: EntradaArvore[], pasta: string): Record<string, string> {
  const prefixo = `${pasta.replace(/\/+$/, '')}/`;
  const arquivos: Record<string, string> = {};
  for (const e of arvore) {
    if (e.type !== 'blob' || !e.path.startsWith(prefixo)) continue;
    const relativo = e.path.slice(prefixo.length);
    if (ARQUIVO_DO_APP.test(relativo)) arquivos[relativo] = e.sha;
  }
  return arquivos;
}

/** Decide o que copiar do aparelho e o que baixar. */
export function planejar(remotos: Record<string, string>, manifesto: Manifesto | null) {
  const copiar: string[] = [];
  const baixar: string[] = [];
  for (const [caminho, sha] of Object.entries(remotos).sort(([a], [b]) => a.localeCompare(b))) {
    (manifesto?.arquivos[caminho] === sha ? copiar : baixar).push(caminho);
  }
  return { copiar, baixar };
}

const API = 'https://api.github.com';
const RAW = 'https://raw.githubusercontent.com';
const codificar = (caminho: string) => caminho.split('/').map(encodeURIComponent).join('/');

export const urlArquivo = (config: ConfigRepositorio, commit: string, relativo: string) =>
  `${RAW}/${config.repositorio}/${commit}/${codificar(`${config.pasta}/${relativo}`)}`;

async function chamarApi(buscar: Buscar, url: string, accept: string) {
  let resposta;
  try {
    resposta = await buscar(url, { headers: { Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' } });
  } catch {
    throw new ErroSincronizacao('Sem conexão com o GitHub.');
  }
  if (resposta.ok) return resposta;
  if (resposta.status === 404) {
    throw new ErroSincronizacao('Repositório ou branch não encontrado. O repositório precisa ser público.');
  }
  if (resposta.status === 403 || resposta.status === 429) {
    throw new ErroSincronizacao('Limite de consultas ao GitHub atingido. Tente de novo em alguns minutos.');
  }
  throw new ErroSincronizacao(`O GitHub respondeu com erro ${resposta.status}.`);
}

export async function sincronizarConteudo(opcoes: {
  config: ConfigRepositorio;
  armazenamento: Armazenamento;
  buscar: Buscar;
  agora?: () => Date;
  /** Padrão false: campos desconhecidos no repositório são ignorados (ver OpcoesValidacao). */
  estrito?: boolean;
}): Promise<ResultadoSincronizacao> {
  const { config, armazenamento, buscar, agora = () => new Date(), estrito = false } = opcoes;

  // 1. Commit atual do branch (resposta em texto puro com o sha).
  const commit = (
    await (
      await chamarApi(buscar, `${API}/repos/${config.repositorio}/commits/${encodeURIComponent(config.branch)}`, 'application/vnd.github.sha')
    ).text()
  ).trim();
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new ErroSincronizacao('Resposta inesperada do GitHub.');

  const manifesto = await armazenamento.lerManifesto();
  if (manifesto?.commit === commit) return { tipo: 'sem-mudancas', commit };

  // 2. Arquivos da pasta naquele commit.
  const arvore = (await (
    await chamarApi(buscar, `${API}/repos/${config.repositorio}/git/trees/${commit}?recursive=1`, 'application/vnd.github+json')
  ).json()) as { tree?: EntradaArvore[]; truncated?: boolean };
  if (!Array.isArray(arvore.tree)) throw new ErroSincronizacao('Resposta inesperada do GitHub.');
  if (arvore.truncated) throw new ErroSincronizacao('O repositório é grande demais para listar de uma vez.');
  const remotos = arquivosDoConteudo(arvore.tree, config.pasta);
  if (!Object.keys(remotos).length) {
    throw new ErroSincronizacao(`A pasta "${config.pasta}" não foi encontrada no repositório.`);
  }

  // 3. Pasta temporária com o novo conteúdo.
  const { copiar, baixar } = planejar(remotos, manifesto);
  await armazenamento.prepararTemporaria();
  try {
    for (const caminho of copiar) await armazenamento.copiarParaTemporaria(caminho);
    for (const caminho of baixar) {
      try {
        await armazenamento.baixarParaTemporaria(caminho, urlArquivo(config, commit, caminho));
      } catch (e) {
        throw new ErroSincronizacao(`Falha ao baixar ${caminho}: ${(e as Error).message}`);
      }
    }

    // 4. Valida antes de trocar.
    const conteudo = montarConteudo(await armazenamento.lerTemporaria(), { estrito });
    if (conteudo.erros.length) {
      await armazenamento.descartarTemporaria();
      return { tipo: 'invalido', commit, erros: conteudo.erros };
    }

    await armazenamento.promoverTemporaria({ commit, baixadoEm: agora().toISOString(), arquivos: remotos });
    return { tipo: 'atualizado', commit, conteudo, baixados: baixar.length, reaproveitados: copiar.length };
  } catch (e) {
    await armazenamento.descartarTemporaria();
    throw e;
  }
}
