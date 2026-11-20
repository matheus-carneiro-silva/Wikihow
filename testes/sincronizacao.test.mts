// Testes da sincronização com o GitHub, usando rede e armazenamento falsos.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { lerJson, type FonteConteudo } from '../src/conteudo/montar.ts';
import {
  arquivosDoConteudo,
  ErroSincronizacao,
  planejar,
  sincronizarConteudo,
  urlArquivo,
  type Armazenamento,
  type Buscar,
  type ConfigRepositorio,
  type Manifesto,
} from '../src/conteudo/sincronizacao.ts';

const config: ConfigRepositorio = { repositorio: 'dono/repo', branch: 'master', pasta: 'conteudo' };
const sha = (texto: string) => createHash('sha1').update(texto).digest('hex');

const guia = (id: string, extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    id,
    titulo: `Guia ${id}`,
    resumo: 'Resumo.',
    categoria: 'casa',
    atualizadoEm: '2026-11-20',
    passos: [{ titulo: 'Passo', texto: 'Texto.' }],
    ...extra,
  });

/** Repositório falso: caminhos completos → conteúdo. */
class GitHubFalso {
  arquivos = new Map<string, string>();
  chamadas: string[] = [];
  falharCom?: number;
  offline = false;

  constructor(arquivos: Record<string, string>) {
    for (const [c, t] of Object.entries(arquivos)) this.arquivos.set(c, t);
  }
  get commit() {
    return sha([...this.arquivos].sort().join('|'));
  }
  buscar: Buscar = async (url) => {
    this.chamadas.push(url);
    if (this.offline) throw new TypeError('Network request failed');
    const resp = (status: number, corpo: unknown) => ({
      ok: status < 400,
      status,
      text: async () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)),
      json: async () => corpo,
    });
    if (this.falharCom) return resp(this.falharCom, 'erro');
    if (url === 'https://api.github.com/repos/dono/repo/commits/master') return resp(200, `${this.commit}\n`);
    if (url === `https://api.github.com/repos/dono/repo/git/trees/${this.commit}?recursive=1`) {
      const tree = [...this.arquivos].map(([path, t]) => ({ path, type: 'blob', sha: sha(t) }));
      return resp(200, { sha: this.commit, tree: [{ path: 'conteudo', type: 'tree', sha: 'x' }, ...tree], truncated: false });
    }
    const raw = `https://raw.githubusercontent.com/dono/repo/${this.commit}/`;
    if (url.startsWith(raw)) {
      const caminho = decodeURIComponent(url.slice(raw.length));
      return this.arquivos.has(caminho) ? resp(200, this.arquivos.get(caminho)!) : resp(404, 'Not Found');
    }
    return resp(404, 'Not Found');
  };
}

/** Armazenamento em memória com a mesma semântica do de expo-file-system. */
class ArmazenamentoFalso implements Armazenamento {
  atual = new Map<string, string>();
  manifesto: Manifesto | null = null;
  temporaria: Map<string, string> | null = null;
  baixados: string[] = [];

  private github: GitHubFalso;
  constructor(github: GitHubFalso) {
    this.github = github;
  }

  async lerManifesto() {
    return this.manifesto;
  }
  async prepararTemporaria() {
    this.temporaria = new Map();
  }
  async copiarParaTemporaria(caminho: string) {
    if (!this.atual.has(caminho)) throw new Error(`não existe no aparelho: ${caminho}`);
    this.temporaria!.set(caminho, this.atual.get(caminho)!);
  }
  async baixarParaTemporaria(caminho: string, url: string) {
    const r = await this.github.buscar(url);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    this.baixados.push(caminho);
    this.temporaria!.set(caminho, await r.text());
  }
  async lerTemporaria(): Promise<FonteConteudo> {
    const t = this.temporaria!;
    const errosLeitura: string[] = [];
    const ler = (c: string) => (t.has(c) ? lerJson(t.get(c)!, c, errosLeitura) : undefined);
    return {
      categorias: ler('categorias.json'),
      sinonimos: ler('sinonimos.json'),
      guias: [...t.keys()].filter((c) => c.startsWith('guias/')).map((nome) => ({ nome, dados: ler(nome) })).filter((g) => g.dados !== undefined),
      imagens: [...t.keys()].filter((c) => c.startsWith('imagens/')).map((c) => c.slice('imagens/'.length)),
      errosLeitura,
    };
  }
  async promoverTemporaria(manifesto: Manifesto) {
    this.atual = this.temporaria!;
    this.temporaria = null;
    this.manifesto = manifesto;
  }
  async descartarTemporaria() {
    this.temporaria = null;
  }
}

const repoBasico = () =>
  new GitHubFalso({
    'conteudo/categorias.json': JSON.stringify([{ id: 'casa', nome: 'Casa' }]),
    'conteudo/sinonimos.json': '[]',
    'conteudo/guias/a.json': guia('a'),
    'conteudo/guias/b.json': guia('b', {
      passos: [{ titulo: 'P', texto: 'T', imagem: { arquivo: 'b/foto.png', descricao: 'Foto.' } }],
    }),
    'conteudo/imagens/b/foto.png': 'PNG-BYTES',
    'conteudo/README.md': '# ignorado',
    'src/app.ts': 'ignorado',
  });

const preparar = (github = repoBasico()) => {
  const armazenamento = new ArmazenamentoFalso(github);
  const sincronizar = () =>
    sincronizarConteudo({ config, armazenamento, buscar: github.buscar, agora: () => new Date('2026-11-20T12:00:00Z') });
  return { github, armazenamento, sincronizar };
};

describe('arquivosDoConteudo', () => {
  it('pega só os arquivos que o app usa, relativos à pasta', () => {
    const arvore = [
      { path: 'conteudo/categorias.json', type: 'blob', sha: '1' },
      { path: 'conteudo/sinonimos.json', type: 'blob', sha: '2' },
      { path: 'conteudo/guias/a.json', type: 'blob', sha: '3' },
      { path: 'conteudo/guias/sub/b.json', type: 'blob', sha: 'x' },
      { path: 'conteudo/imagens/a/foto.JPG', type: 'blob', sha: '4' },
      { path: 'conteudo/imagens/a/notas.txt', type: 'blob', sha: 'x' },
      { path: 'conteudo/README.md', type: 'blob', sha: 'x' },
      { path: 'conteudo/guias', type: 'tree', sha: 'x' },
      { path: 'outra/conteudo/categorias.json', type: 'blob', sha: 'x' },
    ];
    assert.deepEqual(arquivosDoConteudo(arvore, 'conteudo/'), {
      'categorias.json': '1',
      'sinonimos.json': '2',
      'guias/a.json': '3',
      'imagens/a/foto.JPG': '4',
    });
  });
});

describe('planejar', () => {
  it('copia o que não mudou e baixa o resto', () => {
    const manifesto: Manifesto = { commit: 'c', baixadoEm: '', arquivos: { 'a.json': '1', 'b.json': '2', 'velho.json': '9' } };
    assert.deepEqual(planejar({ 'a.json': '1', 'b.json': '3', 'c.json': '4' }, manifesto), {
      copiar: ['a.json'],
      baixar: ['b.json', 'c.json'],
    });
  });
  it('sem manifesto, baixa tudo', () => {
    assert.deepEqual(planejar({ 'a.json': '1' }, null), { copiar: [], baixar: ['a.json'] });
  });
});

describe('urlArquivo', () => {
  it('fixa o commit e codifica o caminho', () => {
    assert.equal(
      urlArquivo(config, 'abc', 'imagens/meu guia/foto ç.png'),
      'https://raw.githubusercontent.com/dono/repo/abc/conteudo/imagens/meu%20guia/foto%20%C3%A7.png',
    );
  });
});

describe('sincronizarConteudo', () => {
  it('na primeira vez baixa tudo e promove', async () => {
    const { github, armazenamento, sincronizar } = preparar();
    const r = await sincronizar();
    assert.equal(r.tipo, 'atualizado');
    if (r.tipo !== 'atualizado') return;
    assert.equal(r.baixados, 5);
    assert.equal(r.reaproveitados, 0);
    assert.deepEqual(r.conteudo.guias.map((g) => g.id).sort(), ['a', 'b']);
    assert.equal(armazenamento.manifesto?.commit, github.commit);
    assert.equal(armazenamento.manifesto?.baixadoEm, '2026-11-20T12:00:00.000Z');
    assert.equal(armazenamento.atual.get('imagens/b/foto.png'), 'PNG-BYTES');
    assert.ok(!armazenamento.atual.has('README.md'));
  });

  it('sem commit novo, faz uma única chamada e não baixa nada', async () => {
    const { github, armazenamento, sincronizar } = preparar();
    await sincronizar();
    github.chamadas = [];
    armazenamento.baixados = [];
    const r = await sincronizar();
    assert.equal(r.tipo, 'sem-mudancas');
    assert.equal(github.chamadas.length, 1);
    assert.deepEqual(armazenamento.baixados, []);
  });

  it('baixa só o que mudou, inclui guias novos e remove os apagados', async () => {
    const { github, armazenamento, sincronizar } = preparar();
    await sincronizar();
    armazenamento.baixados = [];
    github.arquivos.set('conteudo/guias/a.json', guia('a', { titulo: 'Guia A revisto' }));
    github.arquivos.set('conteudo/guias/c.json', guia('c'));
    github.arquivos.delete('conteudo/guias/b.json');
    github.arquivos.delete('conteudo/imagens/b/foto.png');

    const r = await sincronizar();
    assert.equal(r.tipo, 'atualizado');
    if (r.tipo !== 'atualizado') return;
    assert.deepEqual(armazenamento.baixados.sort(), ['guias/a.json', 'guias/c.json']);
    assert.equal(r.reaproveitados, 2); // categorias e sinônimos
    assert.deepEqual([...armazenamento.atual.keys()].sort(), ['categorias.json', 'guias/a.json', 'guias/c.json', 'sinonimos.json']);
    assert.equal(r.conteudo.guias.find((g) => g.id === 'a')?.titulo, 'Guia A revisto');
  });

  it('conteúdo inválido no GitHub não substitui o atual', async () => {
    const { github, armazenamento, sincronizar } = preparar();
    await sincronizar();
    const antes = new Map(armazenamento.atual);
    const commitAntes = armazenamento.manifesto?.commit;
    github.arquivos.set('conteudo/guias/a.json', guia('a', { categoria: 'jardim' }));
    github.arquivos.set('conteudo/guias/quebrado.json', '{ "id": ');

    const r = await sincronizar();
    assert.equal(r.tipo, 'invalido');
    if (r.tipo !== 'invalido') return;
    assert.ok(r.erros.some((e) => e.includes('"jardim" não existe')));
    assert.ok(r.erros.some((e) => e.includes('guias/quebrado.json: JSON inválido')));
    assert.deepEqual(armazenamento.atual, antes);
    assert.equal(armazenamento.manifesto?.commit, commitAntes);
    assert.equal(armazenamento.temporaria, null);
  });

  it('falha no download descarta a temporária e mantém o atual', async () => {
    const { github, armazenamento, sincronizar } = preparar();
    await sincronizar();
    const antes = new Map(armazenamento.atual);
    github.arquivos.set('conteudo/guias/c.json', guia('c'));
    const original = armazenamento.baixarParaTemporaria.bind(armazenamento);
    armazenamento.baixarParaTemporaria = async (caminho, url) => {
      if (caminho === 'guias/c.json') throw new Error('timeout');
      return original(caminho, url);
    };
    await assert.rejects(sincronizar(), (e) => e instanceof ErroSincronizacao && /guias\/c\.json: timeout/.test(e.message));
    assert.deepEqual(armazenamento.atual, antes);
    assert.equal(armazenamento.temporaria, null);
  });

  it('traduz erros de rede e da API', async () => {
    const casos: [Partial<GitHubFalso>, RegExp][] = [
      [{ offline: true }, /Sem conexão/],
      [{ falharCom: 404 }, /precisa ser público/],
      [{ falharCom: 403 }, /Limite de consultas/],
      [{ falharCom: 500 }, /erro 500/],
    ];
    for (const [estado, mensagem] of casos) {
      const { github, sincronizar } = preparar();
      Object.assign(github, estado);
      await assert.rejects(sincronizar(), (e) => e instanceof ErroSincronizacao && mensagem.test(e.message));
    }
  });

  it('recusa pasta inexistente no repositório', async () => {
    const { sincronizar } = preparar(new GitHubFalso({ 'outra/categorias.json': '[]' }));
    await assert.rejects(sincronizar(), /pasta "conteudo" não foi encontrada/);
  });
});
