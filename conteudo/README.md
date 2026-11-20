# Conteúdo offline

Todas as "páginas" do app são arquivos JSON nesta pasta. O APK já vem com o
conteúdo do momento do build, e o app baixa do GitHub (branch `master`) o que
mudar depois — basta fazer push; não precisa de um build novo. A cópia baixada
fica no celular e funciona sem internet. Os tipos ficam em
`src/conteudo/tipos.ts` e as regras de validação em `src/conteudo/validar.ts`.

## Linha editorial

O app é uma biblioteca **pessoal e offline de guias de sobrevivência**: conhecimento prático para
se virar sem depender de serviços, internet ou rede elétrica (saúde, mecânica, energia etc.).
Ao criar guias:

- **Prático e acionável**: passos que dá para executar com o que se tem à mão, com números
  concretos (doses, medidas, tempos) e exemplos calculados.
- **Baseado em fontes confiáveis**, citadas em `fontes`. Quando as fontes divergem, use o valor
  mais conservador e diga que varia.
- **Segurança em primeiro lugar**: `alerta` no topo para riscos sérios e `avisos` nos passos
  perigosos. Diga quando procurar ajuda profissional ou chamar emergência.
- **Contexto brasileiro**: unidades métricas, tensões da rede (127/220 V), normas e órgãos
  nacionais quando existirem.
- **Do básico ao avançado** dentro de cada tema, usando `dificuldade`.
- **Pensado para a busca**: título com a ação, resumo com os termos principais e `tags` com
  sinônimos e perguntas comuns ("apagão", "quantos painéis").

```
conteudo/
├── categorias.json      # lista de categorias
├── sinonimos.json       # grupos de palavras equivalentes para a busca
├── imagens/
│   └── <id-do-guia>/    # imagens dos passos de cada guia (.png, .jpg, .webp)
└── guias/
    └── <id>.json        # um arquivo por guia
```

Depois de adicionar ou editar arquivos, rode:

```bash
npm run conteudo:validar
```

Rode a validação antes do push: se o conteúdo no GitHub estiver inválido, o app
recusa a atualização inteira, mantém a versão anterior e mostra os erros na Início.

## categorias.json

```json
[
  { "id": "cozinha", "nome": "Cozinha", "descricao": "Receitas e técnicas culinárias" }
]
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `id` | sim | kebab-case, único |
| `nome` | sim | nome exibido no filtro |
| `descricao` | não | texto curto |

## guias/&lt;id&gt;.json

```json
{
  "id": "fazer-cafe-coado",
  "titulo": "Como fazer café coado",
  "resumo": "Uma ou duas frases sobre o guia.",
  "categoria": "cozinha",
  "tags": ["café", "bebida"],
  "dificuldade": "facil",
  "tempoMinutos": 10,
  "atualizadoEm": "2026-11-20",
  "alerta": "Aviso importante exibido em destaque no topo.",
  "materiais": ["Pó de café", "Filtro de papel"],
  "passos": [
    {
      "titulo": "Aqueça a água",
      "imagem": {
        "arquivo": "fazer-cafe-coado/temperatura.png",
        "descricao": "Chaleira com termômetro marcando 94 °C.",
        "legenda": "Entre 90 °C e 96 °C."
      },
      "texto": "Primeiro parágrafo.\n\nSegundo parágrafo.",
      "dicas": ["Dica opcional."],
      "avisos": ["Aviso opcional."]
    }
  ],
  "fontes": [
    { "titulo": "Nome da referência", "url": "https://exemplo.com/artigo" }
  ]
}
```

| Campo | Obrigatório | Descrição |
| --- | --- | --- |
| `id` | sim | igual ao nome do arquivo, sem `.json`, em kebab-case |
| `titulo` | sim | título do guia |
| `resumo` | sim | aparece na lista e no topo do guia |
| `categoria` | sim | `id` de uma categoria existente |
| `tags` | não | palavras extras para a busca |
| `dificuldade` | não | `facil`, `media` ou `dificil` |
| `tempoMinutos` | não | inteiro positivo |
| `atualizadoEm` | sim | `AAAA-MM-DD`; a Início ordena pelos mais recentes |
| `alerta` | não | aviso em destaque no topo do guia (ex.: conteúdo educativo, procure atendimento) |
| `materiais` | não | lista exibida antes dos passos |
| `passos` | sim | ao menos um passo |
| `passos[].titulo` | sim | título do passo |
| `passos[].texto` | sim | parágrafos separados por linha em branco (`\n\n`) |
| `passos[].imagem` | não | imagem exibida entre o título e o texto do passo (ver abaixo) |
| `passos[].imagem.arquivo` | sim | caminho dentro de `imagens/`, na pasta do guia: `<id-do-guia>/<nome>.png` |
| `passos[].imagem.descricao` | sim | o que a imagem mostra; lida por leitores de tela e usada pela busca |
| `passos[].imagem.legenda` | não | texto curto exibido embaixo da imagem |
| `passos[].dicas` | não | caixas azuis "Dica" |
| `passos[].avisos` | não | caixas laranja "Atenção" |
| `fontes` | não | referências no fim do guia, com link: `{ "titulo", "url" }` (url `https://`) |

Campos fora dessa lista são recusados por `npm run conteudo:validar`, pelos testes e pelo CI, para pegar
erros de digitação. O app instalado é tolerante: ignora campos que não conhece, para que um campo novo
adicionado aqui não faça versões antigas do app recusarem a atualização.

## Imagens

- Ficam em `imagens/<id-do-guia>/` e entram no app no build, como o resto do conteúdo.
- Formatos: `.png` (ilustrações e diagramas), `.jpg` ou `.webp` (fotos).
- Tamanho recomendado: 1200 px de largura, proporção 16:10, até ~150 KB. A imagem
  ocupa a largura da tela mantendo a proporção.
- A validação recusa imagem inexistente e os testes recusam imagem sem uso ou fora
  da pasta do guia.

## sinonimos.json

Grupos de palavras que a busca trata como equivalentes: buscar "refrigerador"
encontra guias que só falam "geladeira". Cada grupo tem ao menos duas palavras,
uma palavra por item (sem espaços). Plurais e conjugações já são tratados pela
busca, então não precisam entrar aqui.

```json
[
  ["geladeira", "refrigerador"],
  ["carro", "automóvel", "veículo"]
]
```

## Como a busca usa o conteúdo

O motor fica em `src/busca/motor.ts` e roda todo no aparelho.

- **Onde procura**, do maior para o menor peso: `titulo` (5), `tags` (3),
  nome da categoria e `resumo` (2), `materiais` e títulos dos passos (1,5),
  texto, dicas, avisos e descrição/legenda das imagens dos passos (1).
- **Ranking BM25**: palavras raras pesam mais que palavras comuns a muitos guias.
- **Ignora** maiúsculas, acentos e palavras vazias ("como", "de", "para"…).
  "sem" e "não" continuam valendo.
- **Variações**: plural e conjugação caem no mesmo radical ("trocando pneus"
  encontra "Como trocar o pneu").
- **Enquanto digita**: a última palavra é buscada como prefixo ("desentu").
- **Erros de digitação**: palavras com 5+ letras aceitam uma letra errada.
- **Todas as palavras**: um guia só aparece se tiver todas as palavras da busca.
  Se nenhum tiver, a busca mostra os que têm alguma e avisa.
- **Palavras genéricas** ("fazer", "usar", "jeito"…) não são exigidas, só
  melhoram a posição de quem as tem.
- **Trecho**: o resultado mostra o passo onde a busca apareceu e, ao tocar, o
  guia abre rolado até ele, com os termos destacados.

Para o conteúdo render bons resultados: títulos com a ação e o objeto
("Como trocar o pneu do carro"), resumo com os termos principais e `tags` com
palavras que alguém buscaria mas que não aparecem no texto (marcas, apelidos,
nomes alternativos).
