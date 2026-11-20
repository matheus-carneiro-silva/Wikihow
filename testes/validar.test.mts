// Testes da validação do conteúdo JSON (src/conteudo/validar.ts).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Categoria } from '../src/conteudo/tipos.ts';
import { validarCategorias, validarGuia, validarSinonimos } from '../src/conteudo/validar.ts';

const categorias: Categoria[] = [{ id: 'casa', nome: 'Casa' }];
const ARQUIVO = 'guias/limpar-forno.json';

const guiaValido = (): Record<string, unknown> => ({
  id: 'limpar-forno',
  titulo: 'Como limpar o forno',
  resumo: 'Limpeza com bicarbonato.',
  categoria: 'casa',
  tags: ['forno'],
  dificuldade: 'media',
  tempoMinutos: 30,
  atualizadoEm: '2026-11-20',
  materiais: ['Bicarbonato'],
  passos: [{ titulo: 'Aplique a pasta', texto: 'Espalhe.', dicas: ['Use luvas.'], avisos: ['Forno frio.'] }],
});

/** Valida o guia com `alterar` aplicado e devolve os erros. */
const errosCom = (alterar: (g: Record<string, unknown>) => void) => {
  const g = guiaValido();
  alterar(g);
  return validarGuia(g, ARQUIVO, categorias);
};

/** Afirma que há exatamente um erro e que ele contém `trecho`. */
const umErro = (erros: string[], trecho: string) => {
  assert.equal(erros.length, 1, `esperava 1 erro, veio: ${JSON.stringify(erros)}`);
  assert.ok(erros[0].includes(trecho), `"${erros[0]}" não contém "${trecho}"`);
};

describe('validarGuia', () => {
  it('aceita um guia completo', () => {
    assert.deepEqual(validarGuia(guiaValido(), ARQUIVO, categorias), []);
  });

  it('aceita um guia só com os campos obrigatórios', () => {
    const { id, titulo, resumo, categoria, atualizadoEm } = guiaValido();
    const minimo = { id, titulo, resumo, categoria, atualizadoEm, passos: [{ titulo: 'a', texto: 'b' }] };
    assert.deepEqual(validarGuia(minimo, ARQUIVO, categorias), []);
  });

  it('aceita $schema', () => {
    assert.deepEqual(errosCom((g) => (g.$schema = './schema.json')), []);
  });

  it('recusa o que não é objeto', () => {
    for (const dados of [null, [], 'texto', 42]) umErro(validarGuia(dados, ARQUIVO, categorias), 'deve ser um objeto');
  });

  for (const campo of ['titulo', 'resumo', 'categoria']) {
    it(`exige ${campo}`, () => {
      umErro(errosCom((g) => delete g[campo]), `.${campo}: obrigatório`);
      umErro(errosCom((g) => (g[campo] = '   ')), `.${campo}: obrigatório`);
    });
  }

  it('exige id igual ao nome do arquivo', () => {
    umErro(errosCom((g) => (g.id = 'outro')), 'deve ser "limpar-forno"');
    umErro(errosCom((g) => delete g.id), 'deve ser "limpar-forno"');
  });

  it('exige nome de arquivo em kebab-case', () => {
    const g = { ...guiaValido(), id: 'Limpar_Forno' };
    umErro(validarGuia(g, 'guias/Limpar_Forno.json', categorias), 'kebab-case');
  });

  it('exige categoria existente', () => {
    umErro(errosCom((g) => (g.categoria = 'jardim')), '"jardim" não existe');
  });

  it('recusa campos desconhecidos (erros de digitação)', () => {
    umErro(errosCom((g) => (g.titlo = 'x')), 'campo desconhecido "titlo"');
    umErro(errosCom((g) => ((g.passos as Record<string, unknown>[])[0].dica = 'x')), 'passos[0]: campo desconhecido "dica"');
  });

  it('valida dificuldade', () => {
    umErro(errosCom((g) => (g.dificuldade = 'facilimo')), 'dificuldade');
  });

  it('valida tempoMinutos', () => {
    for (const v of [0, -5, 2.5, '10']) umErro(errosCom((g) => (g.tempoMinutos = v)), 'tempoMinutos');
  });

  it('valida atualizadoEm', () => {
    for (const v of ['20/11/2026', '2026-1-5', '2026-13-45', '', undefined]) {
      umErro(errosCom((g) => (g.atualizadoEm = v)), 'atualizadoEm');
    }
  });

  it('valida listas de texto', () => {
    umErro(errosCom((g) => (g.tags = 'forno')), '.tags');
    umErro(errosCom((g) => (g.tags = ['ok', ''])), '.tags');
    umErro(errosCom((g) => (g.materiais = [1, 2])), '.materiais');
  });

  it('exige ao menos um passo', () => {
    umErro(errosCom((g) => (g.passos = [])), 'ao menos um passo');
    umErro(errosCom((g) => delete g.passos), 'ao menos um passo');
  });

  it('valida cada passo', () => {
    umErro(errosCom((g) => (g.passos = ['texto solto'])), 'passos[0]: deve ser um objeto');
    umErro(errosCom((g) => (g.passos = [{ titulo: 'a' }])), 'passos[0].texto');
    umErro(errosCom((g) => (g.passos = [{ texto: 'a' }])), 'passos[0].titulo');
    umErro(errosCom((g) => (g.passos = [{ titulo: 'a', texto: 'b', dicas: 'x' }])), 'passos[0].dicas');
    umErro(errosCom((g) => (g.passos = [{ titulo: 'a', texto: 'b', avisos: [''] }])), 'passos[0].avisos');
  });

  it('acumula vários erros de uma vez', () => {
    const erros = errosCom((g) => {
      g.titulo = '';
      g.categoria = 'jardim';
      g.tempoMinutos = -1;
    });
    assert.equal(erros.length, 3);
  });
});

describe('validarCategorias', () => {
  it('aceita categorias válidas', () => {
    assert.deepEqual(validarCategorias([{ id: 'casa-e-jardim', nome: 'Casa', descricao: 'x' }, { id: 'carro', nome: 'Carro' }]), []);
  });
  it('exige uma lista de objetos', () => {
    umErro(validarCategorias({}), 'deve ser uma lista');
    umErro(validarCategorias(['casa']), 'deve ser um objeto');
  });
  it('valida id, nome e descrição', () => {
    umErro(validarCategorias([{ id: 'Casa', nome: 'Casa' }]), 'kebab-case');
    umErro(validarCategorias([{ id: 'casa' }]), '.nome: obrigatório');
    umErro(validarCategorias([{ id: 'casa', nome: 'Casa', descricao: 3 }]), '.descricao');
    umErro(validarCategorias([{ id: 'casa', nome: 'Casa', icone: 'x' }]), 'campo desconhecido "icone"');
  });
  it('recusa id repetido', () => {
    umErro(validarCategorias([{ id: 'casa', nome: 'A' }, { id: 'casa', nome: 'B' }]), '"casa" repetido');
  });
});

describe('validarSinonimos', () => {
  it('aceita grupos válidos', () => {
    assert.deepEqual(validarSinonimos([['geladeira', 'refrigerador'], ['carro', 'automóvel', 'veículo']]), []);
    assert.deepEqual(validarSinonimos([]), []);
  });
  it('exige uma lista de grupos', () => {
    umErro(validarSinonimos({ geladeira: 'refrigerador' }), 'lista de grupos');
  });
  it('exige ao menos duas palavras por grupo', () => {
    umErro(validarSinonimos([['geladeira']]), 'ao menos 2 palavras');
    umErro(validarSinonimos(['geladeira']), 'ao menos 2 palavras');
  });
  it('exige uma palavra por item', () => {
    umErro(validarSinonimos([['máquina de lavar', 'lavadora']]), 'uma palavra só');
    umErro(validarSinonimos([['geladeira', '']]), 'uma palavra só');
  });
});
