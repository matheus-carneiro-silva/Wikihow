/**
 * Validação do conteúdo JSON. Sem dependências e sem imports com alias para
 * poder ser usado tanto pelo app quanto por `npm run conteudo:validar` (Node).
 */
import type { Categoria, Guia } from './tipos';

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const DIFICULDADES = ['facil', 'media', 'dificil'];
/** Formatos de imagem que o app embute (assets do Metro). */
export const EXTENSOES_IMAGEM = /\.(png|jpe?g|webp)$/i;

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const ehTexto = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const ehListaDeTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every(ehTexto);

/**
 * Opções de validação.
 * - estrito (padrão): campos desconhecidos são erro — pega erros de digitação.
 *   Usado em testes, no script de validação e no CI.
 * - não estrito: campos desconhecidos são ignorados. Usado pelo app ao ler o
 *   conteúdo baixado, para que um campo novo no repositório não quebre versões
 *   antigas do app.
 */
export type OpcoesValidacao = { estrito?: boolean };

const URL_HTTPS = /^https:\/\/\S+$/;

function verificarChaves(
  obj: Record<string, unknown>,
  permitidas: string[],
  local: string,
  erros: string[],
  { estrito = true }: OpcoesValidacao,
) {
  if (!estrito) return;
  for (const chave of Object.keys(obj)) {
    if (chave !== '$schema' && !permitidas.includes(chave)) erros.push(`${local}: campo desconhecido "${chave}"`);
  }
}

export function validarCategorias(dados: unknown, opcoes: OpcoesValidacao = {}): string[] {
  const erros: string[] = [];
  if (!Array.isArray(dados)) return ['categorias.json: deve ser uma lista'];
  const ids = new Set<string>();
  dados.forEach((c, i) => {
    const local = `categorias.json[${i}]`;
    if (!ehObjeto(c)) return void erros.push(`${local}: deve ser um objeto`);
    verificarChaves(c, ['id', 'nome', 'descricao'], local, erros, opcoes);
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

/**
 * @param imagens caminhos disponíveis em conteudo/imagens/ (ex.: "guia/foto.png")
 */
export function validarGuia(
  dados: unknown,
  arquivo: string,
  categorias: Categoria[],
  imagens: ReadonlySet<string> = new Set(),
  opcoes: OpcoesValidacao = {},
): string[] {
  const erros: string[] = [];
  if (!ehObjeto(dados)) return [`${arquivo}: deve ser um objeto`];
  const g = dados as Partial<Record<keyof Guia, unknown>> & Record<string, unknown>;
  verificarChaves(
    g,
    [
      'id',
      'titulo',
      'resumo',
      'categoria',
      'tags',
      'dificuldade',
      'tempoMinutos',
      'atualizadoEm',
      'alerta',
      'materiais',
      'passos',
      'fontes',
    ],
    arquivo,
    erros,
    opcoes,
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
  if (g.alerta !== undefined && !ehTexto(g.alerta)) erros.push(`${arquivo}.alerta: deve ser texto`);
  if (g.fontes !== undefined) {
    if (!Array.isArray(g.fontes)) erros.push(`${arquivo}.fontes: lista de { titulo, url }`);
    else
      g.fontes.forEach((f, i) => {
        const local = `${arquivo}.fontes[${i}]`;
        if (!ehObjeto(f)) return void erros.push(`${local}: deve ser um objeto { titulo, url }`);
        verificarChaves(f, ['titulo', 'url'], local, erros, opcoes);
        if (!ehTexto(f.titulo)) erros.push(`${local}.titulo: obrigatório`);
        if (!ehTexto(f.url) || !URL_HTTPS.test(f.url)) erros.push(`${local}.url: endereço https://`);
      });
  }

  if (!Array.isArray(g.passos) || g.passos.length === 0) {
    erros.push(`${arquivo}.passos: lista com ao menos um passo`);
  } else {
    g.passos.forEach((p, i) => {
      const local = `${arquivo}.passos[${i}]`;
      if (!ehObjeto(p)) return void erros.push(`${local}: deve ser um objeto`);
      verificarChaves(p, ['titulo', 'texto', 'imagem', 'dicas', 'avisos'], local, erros, opcoes);
      if (!ehTexto(p.titulo)) erros.push(`${local}.titulo: obrigatório`);
      if (!ehTexto(p.texto)) erros.push(`${local}.texto: obrigatório`);
      if (p.dicas !== undefined && !ehListaDeTextos(p.dicas)) erros.push(`${local}.dicas: lista de textos`);
      if (p.avisos !== undefined && !ehListaDeTextos(p.avisos)) erros.push(`${local}.avisos: lista de textos`);
      if (p.imagem !== undefined) validarImagem(p.imagem, `${local}.imagem`, imagens, erros, opcoes);
    });
  }
  return erros;
}

function validarImagem(
  img: unknown,
  local: string,
  imagens: ReadonlySet<string>,
  erros: string[],
  opcoes: OpcoesValidacao,
) {
  if (!ehObjeto(img)) return void erros.push(`${local}: deve ser um objeto { arquivo, descricao, legenda? }`);
  verificarChaves(img, ['arquivo', 'descricao', 'legenda'], local, erros, opcoes);
  if (!ehTexto(img.arquivo)) erros.push(`${local}.arquivo: obrigatório`);
  else if (!EXTENSOES_IMAGEM.test(img.arquivo)) erros.push(`${local}.arquivo: use .png, .jpg ou .webp`);
  else if (!imagens.has(img.arquivo)) erros.push(`${local}.arquivo: "${img.arquivo}" não existe em conteudo/imagens/`);
  if (!ehTexto(img.descricao)) erros.push(`${local}.descricao: obrigatória (descreve a imagem para acessibilidade e busca)`);
  if (img.legenda !== undefined && !ehTexto(img.legenda)) erros.push(`${local}.legenda: deve ser texto`);
}
