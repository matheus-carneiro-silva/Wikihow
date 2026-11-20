/**
 * Formato das "páginas" offline do app. Cada guia é um arquivo JSON em
 * conteudo/guias/<id>.json; as categorias ficam em conteudo/categorias.json.
 * Documentação completa do formato: conteudo/README.md.
 */

export type Dificuldade = 'facil' | 'media' | 'dificil';

export type Categoria = {
  /** Identificador em kebab-case, referenciado por Guia.categoria. */
  id: string;
  nome: string;
  descricao?: string;
};

export type Fonte = {
  titulo: string;
  /** Endereço https:// da referência. */
  url: string;
};

export type ImagemPasso = {
  /** Caminho dentro de conteudo/imagens/ (ex.: "trocar-pneu-furado/aperto-em-cruz.png"). */
  arquivo: string;
  /** O que a imagem mostra: lido por leitores de tela e usado pela busca. */
  descricao: string;
  /** Texto curto exibido embaixo da imagem. */
  legenda?: string;
};

export type Passo = {
  titulo: string;
  /** Parágrafos separados por linha em branco ("\n\n"). */
  texto: string;
  /** Imagem exibida entre o título e o texto do passo. */
  imagem?: ImagemPasso;
  dicas?: string[];
  avisos?: string[];
};

export type Guia = {
  /** Igual ao nome do arquivo, sem .json (kebab-case). */
  id: string;
  titulo: string;
  resumo: string;
  categoria: string;
  tags?: string[];
  dificuldade?: Dificuldade;
  tempoMinutos?: number;
  /** Data no formato AAAA-MM-DD. */
  atualizadoEm: string;
  /** Aviso importante exibido em destaque no topo do guia. */
  alerta?: string;
  materiais?: string[];
  passos: Passo[];
  /** Referências exibidas no fim do guia, com link. */
  fontes?: Fonte[];
};
