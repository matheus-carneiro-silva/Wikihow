// Testes do conteúdo real em conteudo/: falham se algum JSON estiver inválido.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { lerConteudo } from '../scripts/ler-conteudo.mts';
import { criarMotorDeBusca } from '../src/busca/motor.ts';

const conteudo = lerConteudo();

describe('conteúdo real', () => {
  it('não tem erros de validação', () => {
    assert.deepEqual(conteudo.erros, []);
  });

  it('todos os arquivos de guias foram carregados', () => {
    assert.equal(conteudo.guias.length, conteudo.totalArquivos);
  });

  it('toda categoria tem ao menos um guia', () => {
    const usadas = new Set(conteudo.guias.map((g) => g.categoria));
    const vazias = conteudo.categorias.filter((c) => !usadas.has(c.id)).map((c) => c.id);
    assert.deepEqual(vazias, []);
  });

  it('toda imagem em conteudo/imagens/ é usada por algum passo', () => {
    const usadas = new Set(conteudo.guias.flatMap((g) => g.passos.flatMap((p) => (p.imagem ? [p.imagem.arquivo] : []))));
    assert.deepEqual(conteudo.imagens.filter((i) => !usadas.has(i)), []);
  });

  it('imagens ficam na pasta do próprio guia', () => {
    const fora = conteudo.guias.flatMap((g) =>
      g.passos.flatMap((p) => (p.imagem && !p.imagem.arquivo.startsWith(`${g.id}/`) ? [p.imagem.arquivo] : [])),
    );
    assert.deepEqual(fora, []);
  });

  it('cada guia é o primeiro resultado ao buscar pelo próprio título', () => {
    const motor = criarMotorDeBusca(conteudo.guias, conteudo.categorias, conteudo.sinonimos);
    const fora = conteudo.guias
      .filter((g) => motor.buscar(g.titulo).resultados[0]?.guia.id !== g.id)
      .map((g) => g.id);
    assert.deepEqual(fora, []);
  });
});

/** Pasta de conteúdo fictícia: 2 guias, 1 deles com imagem. */
function criarPastaFicticia(): string {
  const pasta = mkdtempSync(join(tmpdir(), 'conteudo-'));
  mkdirSync(join(pasta, 'guias'));
  mkdirSync(join(pasta, 'imagens', 'com-imagem'), { recursive: true });
  writeFileSync(join(pasta, 'categorias.json'), JSON.stringify([{ id: 'casa', nome: 'Casa' }]));
  writeFileSync(join(pasta, 'sinonimos.json'), JSON.stringify([['geladeira', 'refrigerador']]));
  const guia = (id: string, passo: Record<string, unknown>) =>
    JSON.stringify({ id, titulo: id, resumo: 'Resumo.', categoria: 'casa', atualizadoEm: '2026-11-20', passos: [passo] });
  writeFileSync(join(pasta, 'guias', 'sem-imagem.json'), guia('sem-imagem', { titulo: 'P', texto: 'T' }));
  writeFileSync(
    join(pasta, 'guias', 'com-imagem.json'),
    guia('com-imagem', { titulo: 'P', texto: 'T', imagem: { arquivo: 'com-imagem/foto.png', descricao: 'Foto.' } }),
  );
  writeFileSync(join(pasta, 'imagens', 'com-imagem', 'foto.png'), 'PNG');
  return pasta;
}

describe('lerConteudo com arquivos quebrados', () => {
  // Cada teste estraga uma pasta fictícia nova (independe do conteúdo real).
  let pasta = '';
  beforeEach(() => {
    pasta = criarPastaFicticia();
  });
  afterEach(() => rmSync(pasta, { recursive: true, force: true }));

  it('lê a pasta fictícia sem erros', () => {
    const r = lerConteudo(pasta);
    assert.deepEqual(r.erros, []);
    assert.deepEqual(r.guias.map((g) => g.id).sort(), ['com-imagem', 'sem-imagem']);
    assert.deepEqual(r.imagens, ['com-imagem/foto.png']);
  });

  it('reporta JSON inválido sem interromper os outros arquivos', () => {
    writeFileSync(join(pasta, 'guias', 'quebrado.json'), '{ "id": ');
    const r = lerConteudo(pasta);
    assert.equal(r.erros.length, 1);
    assert.match(r.erros[0], /guias\/quebrado\.json: JSON inválido/);
    assert.equal(r.guias.length, 2);
  });

  it('sinônimos quebrados viram erro, mas os guias continuam válidos', () => {
    writeFileSync(join(pasta, 'sinonimos.json'), '[["geladeira"]]');
    let r = lerConteudo(pasta);
    assert.deepEqual(r.erros, ['sinonimos.json[0]: grupo com ao menos 2 palavras']);
    assert.deepEqual(r.sinonimos, []);
    assert.equal(r.guias.length, 2);

    writeFileSync(join(pasta, 'sinonimos.json'), 'nada');
    r = lerConteudo(pasta);
    assert.match(r.erros[0], /sinonimos\.json: JSON inválido/);
  });

  it('categorias.json ilegível também recusa os guias', () => {
    writeFileSync(join(pasta, 'categorias.json'), '');
    const r = lerConteudo(pasta);
    assert.match(r.erros[0], /categorias\.json: JSON inválido/);
    assert.equal(r.guias.length, 0);
  });

  it('sem a pasta de imagens, os guias que usam imagem são recusados', () => {
    rmSync(join(pasta, 'imagens'), { recursive: true });
    const r = lerConteudo(pasta);
    assert.deepEqual(r.imagens, []);
    assert.deepEqual(r.guias.map((g) => g.id), ['sem-imagem']);
    assert.equal(r.erros.length, 1);
    assert.match(r.erros[0], /"com-imagem\/foto\.png" não existe em conteudo\/imagens/);
  });

  it('com categorias inválidas, os guias também são recusados', () => {
    writeFileSync(join(pasta, 'categorias.json'), '{}');
    const r = lerConteudo(pasta);
    assert.ok(r.erros.includes('categorias.json: deve ser uma lista'));
    assert.equal(r.guias.length, 0);
  });
});
