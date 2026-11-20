/**
 * Conteúdo baixado do GitHub, guardado em <documentos do app>/conteudo/.
 * Implementa o `Armazenamento` usado pela sincronização com expo-file-system.
 */
import { Directory, File, Paths } from 'expo-file-system';

import { lerJson, type FonteConteudo } from './montar';
import type { Armazenamento, Manifesto } from './sincronizacao';
import { EXTENSOES_IMAGEM } from './validar';

const NOME_ATUAL = 'conteudo';
const NOME_TEMPORARIA = 'conteudo-novo';
const MANIFESTO = 'manifesto.json';

const pastaAtual = () => new Directory(Paths.document, NOME_ATUAL);
const pastaTemporaria = () => new Directory(Paths.document, NOME_TEMPORARIA);
const arquivo = (pasta: Directory, relativo: string) => new File(pasta, ...relativo.split('/'));

function garantirPai(f: File) {
  const pai = f.parentDirectory;
  if (!pai.exists) pai.create({ intermediates: true });
}

function lerManifestoDe(pasta: Directory): Manifesto | null {
  const f = new File(pasta, MANIFESTO);
  if (!f.exists) return null;
  try {
    return JSON.parse(f.textSync()) as Manifesto;
  } catch {
    return null;
  }
}

/** Caminhos relativos de todos os arquivos de uma pasta (recursivo). */
function listar(pasta: Directory, prefixo = ''): string[] {
  if (!pasta.exists) return [];
  return pasta.list().flatMap((item) =>
    item instanceof Directory ? listar(item, `${prefixo}${item.name}/`) : [`${prefixo}${item.name}`],
  );
}

/** Lê uma pasta de conteúdo para validação/montagem. */
async function lerPasta(pasta: Directory): Promise<FonteConteudo> {
  const errosLeitura: string[] = [];
  const ler = async (relativo: string) => {
    const f = arquivo(pasta, relativo);
    return f.exists ? lerJson(await f.text(), relativo, errosLeitura) : undefined;
  };
  const nomesGuias = listar(new Directory(pasta, 'guias')).filter((n) => !n.includes('/') && n.endsWith('.json'));
  const guias: FonteConteudo['guias'] = [];
  for (const n of nomesGuias) {
    const dados = await ler(`guias/${n}`);
    if (dados !== undefined) guias.push({ nome: `guias/${n}`, dados });
  }
  return {
    categorias: await ler('categorias.json'),
    sinonimos: await ler('sinonimos.json'),
    guias,
    imagens: listar(new Directory(pasta, 'imagens')).filter((n) => EXTENSOES_IMAGEM.test(n)),
    errosLeitura,
  };
}

export type ConteudoBaixado = {
  fonte: FonteConteudo;
  manifesto: Manifesto;
  /** URI local de uma imagem (caminho dentro de imagens/). */
  uriImagem: (relativo: string) => string;
};

/** Conteúdo já baixado no aparelho, ou null se ainda não houve sincronização. */
export async function lerConteudoBaixado(): Promise<ConteudoBaixado | null> {
  const pasta = pastaAtual();
  const manifesto = pasta.exists ? lerManifestoDe(pasta) : null;
  if (!manifesto) return null;
  return {
    fonte: await lerPasta(pasta),
    manifesto,
    uriImagem: uriImagemBaixada,
  };
}

/** URI local de uma imagem do conteúdo baixado (caminho dentro de imagens/). */
export const uriImagemBaixada = (relativo: string) => arquivo(new Directory(pastaAtual(), 'imagens'), relativo).uri;

/** Apaga o conteúdo baixado (volta a usar o conteúdo embutido no APK). */
export function apagarConteudoBaixado() {
  for (const p of [pastaAtual(), pastaTemporaria()]) if (p.exists) p.delete();
}

export const armazenamentoExpo: Armazenamento = {
  async lerManifesto() {
    return lerManifestoDe(pastaAtual());
  },
  async prepararTemporaria() {
    const t = pastaTemporaria();
    if (t.exists) t.delete();
    t.create({ intermediates: true });
  },
  async copiarParaTemporaria(caminho) {
    const destino = arquivo(pastaTemporaria(), caminho);
    garantirPai(destino);
    await arquivo(pastaAtual(), caminho).copy(destino);
  },
  async baixarParaTemporaria(caminho, url) {
    const destino = arquivo(pastaTemporaria(), caminho);
    garantirPai(destino);
    // Lança exceção em resposta HTTP de erro, então um 404 nunca vira arquivo.
    await File.downloadFileAsync(url, destino);
  },
  async lerTemporaria() {
    return lerPasta(pastaTemporaria());
  },
  async promoverTemporaria(manifesto) {
    const t = pastaTemporaria();
    new File(t, MANIFESTO).writeSync(JSON.stringify(manifesto));
    const atual = pastaAtual();
    if (atual.exists) atual.delete();
    t.rename(NOME_ATUAL);
  },
  async descartarTemporaria() {
    const t = pastaTemporaria();
    if (t.exists) t.delete();
  },
};
