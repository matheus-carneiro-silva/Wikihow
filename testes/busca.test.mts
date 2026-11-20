// Testes do motor de busca. Uso: npm test (Node 22.18+).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Categoria, Guia } from '../src/conteudo/tipos.ts';
import { criarMotorDeBusca, destacar, formas, raiz, singular } from '../src/busca/motor.ts';

const categorias: Categoria[] = [
  { id: 'cozinha', nome: 'Cozinha' },
  { id: 'casa', nome: 'Casa' },
  { id: 'carro', nome: 'Carro' },
];

const guia = (id: string, categoria: string, titulo: string, resumo: string, passos: Guia['passos'], extra: Partial<Guia> = {}): Guia => ({
  id, categoria, titulo, resumo, passos, atualizadoEm: '2026-11-20', ...extra,
});

const guias: Guia[] = [
  guia('fazer-cafe-coado', 'cozinha', 'Como fazer café coado', 'Café no filtro de papel.', [
    { titulo: 'Aqueça a água', texto: 'Desligue antes da fervura forte.' },
    { titulo: 'Adicione o pó', texto: 'Use 10 g de pó para cada 100 ml de água.' },
  ], { tags: ['bebida'] }),
  guia('pao-caseiro', 'cozinha', 'Pão caseiro', 'Pão de fermentação natural feito em casa.', [
    { titulo: 'Misture a farinha', texto: 'Misture farinha, água e sal.' },
    { titulo: 'Asse', texto: 'Asse no forno a 230 graus. O tempo de forno é de 40 minutos.' },
  ]),
  guia('trocar-pneu', 'carro', 'Como trocar o pneu do carro', 'Troca do pneu furado pelo estepe.', [
    { titulo: 'Afrouxe os parafusos', texto: 'Com a chave de roda, afrouxe os parafusos antes de levantar o carro.' },
    { titulo: 'Levante o carro', texto: 'Posicione o macaco no ponto indicado no manual.', avisos: ['Nunca fique embaixo do veículo.'] },
    {
      titulo: 'Aperte',
      texto: 'Aperte bem.',
      imagem: { arquivo: 'trocar-pneu/ordem.png', descricao: 'Parafusos numerados em estrela.', legenda: 'Ordem de aperto.' },
    },
  ]),
  guia('desentupir-pia', 'casa', 'Como desentupir a pia da cozinha', 'Métodos caseiros para entupimentos leves.', [
    { titulo: 'Use água fervente', texto: 'Despeje água fervente no ralo.' },
    { titulo: 'Limpe o sifão', texto: 'Desrosqueie o sifão e limpe os resíduos.' },
  ]),
  guia('limpar-geladeira', 'casa', 'Como limpar a geladeira', 'Limpeza completa das prateleiras.', [
    { titulo: 'Esvazie', texto: 'Retire os alimentos e as prateleiras.' },
    { titulo: 'Lave', texto: 'Use bicarbonato dissolvido em água morna.' },
  ]),
];

const sinonimos = [['geladeira', 'refrigerador'], ['carro', 'automóvel', 'veículo']];
const motor = criarMotorDeBusca(guias, categorias, sinonimos);
const ids = (consulta: string, filtro?: { categoria?: string }) => motor.buscar(consulta, filtro).resultados.map((r) => r.guia.id);
const primeiro = (consulta: string) => ids(consulta)[0];

describe('normalização', () => {
  it('reduz plurais', () => {
    assert.equal(singular('pneus'), 'pneu');
    assert.equal(singular('botões'), 'botão');
    assert.equal(singular('animais'), 'animal');
    assert.equal(singular('papéis'), 'papel');
    assert.equal(singular('flores'), 'flor');
    assert.equal(singular('lápis'), 'lápis');
  });
  it('dá o mesmo radical para variações', () => {
    assert.equal(raiz('trocando'), raiz('trocar'));
    assert.equal(raiz('troca'), raiz('trocar'));
    assert.equal(raiz('cafés'), raiz('café'));
    assert.equal(raiz('cafe'), raiz('café'));
    assert.equal(raiz('agua'), raiz('água'));
    assert.equal(raiz('geladeiras'), raiz('geladeira'));
    assert.equal(raiz('troque'), raiz('trocar'));
    assert.equal(raiz('coloque'), raiz('colocar'));
  });
  it('separa palavras que o stemmer juntaria por engano', () => {
    assert.notEqual(raiz('calça'), raiz('calçado'));
    assert.equal(raiz('calças'), raiz('calça'));
  });
});

describe('busca', () => {
  it('ignora acentos e maiúsculas', () => {
    assert.equal(primeiro('CAFE'), 'fazer-cafe-coado');
    assert.equal(primeiro('pao'), 'pao-caseiro');
  });
  it('encontra plurais e conjugações', () => {
    assert.equal(primeiro('pneus'), 'trocar-pneu');
    assert.equal(primeiro('trocando pneu'), 'trocar-pneu');
    assert.equal(primeiro('geladeiras'), 'limpar-geladeira');
  });
  it('busca por prefixo enquanto digita', () => {
    assert.equal(primeiro('desentu'), 'desentupir-pia');
    assert.equal(primeiro('gelad'), 'limpar-geladeira');
  });
  it('não usa prefixo em palavras de 1 ou 2 letras', () => {
    // "ca" não deve casar "carro", "café" nem "casa" por prefixo.
    assert.deepEqual(ids('ca'), []);
    assert.equal(primeiro('car'), 'trocar-pneu');
  });
  it('tolera erros de digitação', () => {
    assert.equal(primeiro('geladiera'), 'limpar-geladeira');
    assert.equal(primeiro('desentupri'), 'desentupir-pia');
  });
  it('usa sinônimos', () => {
    assert.equal(primeiro('refrigerador'), 'limpar-geladeira');
    assert.equal(primeiro('pneu automóvel'), 'trocar-pneu');
  });
  it('exige todas as palavras quando possível', () => {
    assert.deepEqual(ids('pia cozinha'), ['desentupir-pia']);
    assert.equal(motor.buscar('pia cozinha').parcial, false);
  });
  it('relaxa para qualquer palavra quando nada tem todas', () => {
    const r = motor.buscar('geladeira pneu');
    assert.equal(r.parcial, true);
    assert.deepEqual(new Set(r.resultados.map((x) => x.guia.id)), new Set(['limpar-geladeira', 'trocar-pneu']));
  });
  it('não exige palavras genéricas como "fazer"', () => {
    assert.equal(primeiro('como fazer pão'), 'pao-caseiro');
    assert.equal(motor.buscar('como fazer pão').parcial, false);
  });
  it('distingue palavra com acento de palavra vazia', () => {
    assert.deepEqual(formas('no'), []);
    assert.deepEqual(formas('nó').slice(0, 1), ['no']);
    assert.deepEqual(formas('à'), []);
    assert.deepEqual(formas('voce'), []);
    assert.deepEqual(formas('você'), []);
    assert.deepEqual(formas('não').slice(0, 1), ['nao']);
  });
  it('ignora palavras de pergunta', () => {
    assert.equal(primeiro('quanto tempo de forno pro pão'), 'pao-caseiro');
    assert.equal(motor.buscar('quanto tempo de forno pro pão').parcial, false);
    assert.equal(motor.buscar('onde está o macaco').parcial, false);
  });
  it('descarta resultados muito fracos', () => {
    // "lave" quase igual a "levante" não deve aparecer junto da geladeira.
    const r = motor.buscar('lave').resultados;
    assert.deepEqual(r.map((x) => x.guia.id), ['limpar-geladeira']);
  });
  it('trecho prioriza termos que o título não mostra', () => {
    const [r] = motor.buscar('geladeira bicarbonato').resultados;
    assert.ok(r.trecho.partes.some((p) => p.destaque && p.texto === 'bicarbonato'));
  });
  it('mostra o resumo quando ele já tem o termo (mesmo em outro número)', () => {
    const [r] = motor.buscar('pneus').resultados;
    assert.equal(r.trecho.passo, undefined);
  });
  it('prioriza o título sobre o texto dos passos', () => {
    // "água" aparece no título de um passo do café e só no texto do pão.
    assert.equal(primeiro('água'), 'fazer-cafe-coado');
  });
  it('aponta o passo onde o termo aparece', () => {
    const [r] = motor.buscar('macaco').resultados;
    assert.equal(r.guia.id, 'trocar-pneu');
    assert.equal(r.trecho.passo, 1);
    assert.ok(r.trecho.partes.some((p) => p.destaque && p.texto === 'macaco'));
  });
  it('encontra pela descrição e pela legenda da imagem', () => {
    const [r] = motor.buscar('estrela').resultados;
    assert.equal(r.guia.id, 'trocar-pneu');
    assert.equal(r.trecho.passo, 2);
    assert.ok(r.trecho.partes.some((p) => p.destaque && p.texto === 'estrela'));
    assert.equal(primeiro('ordem de aperto'), 'trocar-pneu');
  });
  it('encontra texto de avisos', () => {
    assert.equal(primeiro('embaixo'), 'trocar-pneu');
  });
  it('filtra por categoria', () => {
    assert.deepEqual(ids('água', { categoria: 'casa' }).sort(), ['desentupir-pia', 'limpar-geladeira']);
  });
  it('busca só com palavras genéricas ainda encontra', () => {
    // Sem palavras obrigatórias, as genéricas viram a própria busca.
    const r = motor.buscar('como fazer');
    assert.equal(r.parcial, false);
    assert.deepEqual(r.resultados.map((x) => x.guia.id), ['fazer-cafe-coado']);
  });
  it('sem termos úteis lista tudo', () => {
    assert.equal(ids('').length, guias.length);
    assert.equal(ids('como de para').length, guias.length);
  });
  it('não retorna nada para termos inexistentes', () => {
    assert.deepEqual(ids('xyzw'), []);
  });
});

describe('destaque', () => {
  it('marca variações da palavra', () => {
    const partes = destacar('Troque os pneus e troque o óleo.', [raiz('pneu')]);
    assert.deepEqual(partes.filter((p) => p.destaque).map((p) => p.texto), ['pneus']);
  });
});
