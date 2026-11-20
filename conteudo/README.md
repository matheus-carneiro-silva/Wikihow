# Conteúdo offline

Todas as "páginas" do app são arquivos JSON nesta pasta. Elas entram no bundle
no build, então o app funciona sem internet. Os tipos ficam em
`src/conteudo/tipos.ts` e as regras de validação em `src/conteudo/validar.ts`.

```
conteudo/
├── categorias.json      # lista de categorias
└── guias/
    └── <id>.json        # um arquivo por guia
```

Depois de adicionar ou editar arquivos, rode:

```bash
npm run conteudo:validar
```

Com o app aberto em desenvolvimento, um JSON inválido mostra a lista de erros
na tela. Em um build de produção, só o guia inválido é ignorado.

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
  "materiais": ["Pó de café", "Filtro de papel"],
  "passos": [
    {
      "titulo": "Aqueça a água",
      "texto": "Primeiro parágrafo.\n\nSegundo parágrafo.",
      "dicas": ["Dica opcional."],
      "avisos": ["Aviso opcional."]
    }
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
| `materiais` | não | lista exibida antes dos passos |
| `passos` | sim | ao menos um passo |
| `passos[].titulo` | sim | título do passo |
| `passos[].texto` | sim | parágrafos separados por linha em branco (`\n\n`) |
| `passos[].dicas` | não | caixas azuis "Dica" |
| `passos[].avisos` | não | caixas laranja "Atenção" |

Campos fora dessa lista são recusados pela validação, para pegar erros de digitação.

A busca da aba Explorar procura em título, resumo, tags e títulos dos passos,
ignorando maiúsculas e acentos.
