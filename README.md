# Wikihow

App pessoal de guias passo a passo ("como fazer"), feito com [Expo](https://expo.dev) (SDK 58, React Native 0.88, TypeScript), **exclusivamente para Android** e **100% offline**: os guias são arquivos JSON em [`conteudo/`](conteudo/README.md). O APK já vem com eles, e o app
baixa do GitHub os guias novos ou alterados — **adicionar um guia não exige um novo build**.

## Pré-requisitos

- Node.js 22.18+ (o script de validação de conteúdo roda TypeScript direto no Node)
- Um celular Android com o app **Expo Go**, ou um emulador Android (Android Studio)
- Para builds na nuvem: conta no [EAS](https://expo.dev/eas)

## Começando

```bash
npm install
npm start          # inicia o Metro; escaneie o QR code com o Expo Go
npm run android    # inicia e abre direto no emulador/dispositivo conectado
```

## Scripts

| Script | O que faz |
| --- | --- |
| `npm start` | Servidor de desenvolvimento (Expo Go) |
| `npm run android` | Servidor de desenvolvimento abrindo no Android |
| `npm run android:dev-build` | Compila e instala um development build local (requer Android SDK) |
| `npm run prebuild` | Gera a pasta nativa `android/` a partir do `app.json` |
| `npm run typecheck` | Verificação de tipos com TypeScript |
| `npm run conteudo:validar` | Valida os JSON de `conteudo/` |
| `npm test` | Testes da busca, da validação e do conteúdo real de `conteudo/` |
| `npm run test:cobertura` | Testes com relatório de cobertura |
| `npm run doctor` | Diagnóstico de configuração e dependências |
| `npm run build:apk` | Build de APK na nuvem da Expo (perfil `preview`, para testar) |
| `npm run build:release` | Build de APK na nuvem da Expo (perfil `production`, o mesmo da Release) |

## Conteúdo sem build

O app lê a pasta `conteudo/` deste repositório (branch `master`) direto do GitHub e guarda uma cópia
no celular para usar offline:

- **Ao abrir o app** e ao **puxar a lista da Início para baixo**, ele pergunta ao GitHub se há um commit
  novo. Se houver, baixa só os arquivos novos ou alterados e reaproveita o resto.
- O conteúdo baixado passa pela mesma validação do app. Se algo estiver inválido, a versão atual é
  mantida e a Início mostra os erros.
- Antes da primeira sincronização (ou sem internet), o app usa os guias que vieram no APK.
- **O repositório precisa ser público**: o app baixa sem autenticação (limite do GitHub: 60 consultas
  por hora por aparelho; cada verificação sem novidades gasta 1).
- Repositório, branch e pasta ficam em `app.json` → `expo.extra.conteudo`.

Fluxo para publicar guias: commit em `conteudo/` → push na `master` → no celular, puxar a lista.
Um build novo só é necessário quando o **código** do app muda.

## Navegação (Expo Router)

As rotas ficam em `src/app/` — cada arquivo é uma tela:

```
conteudo/                   # páginas offline em JSON (formato em conteudo/README.md)
├── categorias.json
├── sinonimos.json
├── guias/<id>.json
└── imagens/<id>/           # imagens dos passos
design/ilustracoes/         # fontes SVG das ilustrações
src/
├── app/
│   ├── _layout.tsx         # pilha raiz (Stack)
│   ├── (tabs)/             # grupo de abas (não aparece na URL)
│   │   ├── _layout.tsx     # abas nativas (Material 3 no Android)
│   │   ├── index.tsx       # aba Início: todos os guias, mais recentes primeiro
│   │   ├── explorar.tsx    # aba Explorar: busca com trechos destacados e filtro por categoria
│   │   └── ajustes.tsx     # aba Ajustes: tema (sistema, claro, escuro) e informações do app
│   ├── guia/[id].tsx       # rota /guia/<id>: o guia com seus passos (rola até ?passo=N)
│   └── +not-found.tsx      # rota inexistente
├── busca/motor.ts          # motor de busca (MiniSearch + stemming em português)
├── conteudo/               # tipos, validação, conteúdo embutido e sincronização com o GitHub
├── components/             # componentes reutilizáveis
└── tema.tsx                # paletas clara e escura, preferência de tema e useEstilos
```

- **Conteúdo**: `src/conteudo/index.ts` carrega todos os arquivos de `conteudo/guias/` com `require.context`, então basta criar o arquivo — não há lista para manter.
- **Busca**: detalhes de como funciona e de como escrever conteúdo que a busca encontra bem em [`conteudo/README.md`](conteudo/README.md#como-a-busca-usa-o-conteúdo). Testes em `testes/`.
- **Abas**: usam `NativeTabs` de `expo-router/native-tabs`, que renderiza a barra de navegação nativa do Android. Ícones são [Material Symbols](https://fonts.google.com/icons) passados no `md`. Para adicionar uma aba, crie o arquivo em `src/app/(tabs)/` e um `NativeTabs.Trigger` com o mesmo `name` (máximo de 5 abas).
- **Navegação**: `<Link href={{ pathname: '/guia/[id]', params: { id } }}>` ou `router.push(...)`. Rotas tipadas estão ativas (`experiments.typedRoutes`); os tipos são gerados em `.expo/types` ao rodar `npm start`.
- **Tema**: o padrão segue o tema do Android; a escolha em Ajustes fica salva no aparelho. Componentes
  pegam as cores com `useTema()` e criam estilos com `useEstilos(criarEstilos)`, em que
  `criarEstilos = (cores: Cores) => StyleSheet.create({...})` fica fora do componente.
- Imports com o alias `@/` apontam para `src/`.
- Deep links usam o scheme `wikihow://` (ex.: `adb shell am start -a android.intent.action.VIEW -d "wikihow://guia/fazer-cafe-coado"`).

## Versões e builds

Publicar uma **Release** no GitHub gera o APK daquela versão
(`.github/workflows/release.yml`):

1. Testes e checagem de tipos rodam primeiro; se falharem, não há build.
2. A tag da Release vira a versão do app: `v1.2.0` → `1.2.0` (formato `v1.2.3` obrigatório).
   O `version` do `app.json` no repositório não é usado nas Releases.
3. O build roda na nuvem da Expo (EAS Build) com o perfil `production`. O `versionCode`
   é incrementado pela Expo a cada build, então o Android aceita instalar por cima.
4. O APK (`wikihow-v1.2.0.apk`) é anexado à Release. No celular, baixe e instale
   (o Android pede para permitir instalação de fontes desconhecidas na primeira vez).

A versão instalada aparece na aba Início.

### Configuração inicial (uma vez só)

Tudo pode ser feito pelo navegador, inclusive no celular:

1. Crie uma conta em [expo.dev](https://expo.dev) e, em **Account settings → Access tokens**,
   crie um token.
2. No GitHub, em **Settings → Secrets and variables → Actions**, crie o secret
   `EXPO_TOKEN` com esse token.
3. Em **Actions → Configurar EAS → Run workflow**, rode o workflow na `master`. Ele
   liga o projeto à sua conta Expo (equivale a `eas init`) e faz commit do `app.json`
   com o `projectId`.

A chave de assinatura é gerada pela Expo no primeiro build de Release e guardada
na sua conta; todas as versões seguintes usam a mesma chave, o que permite
atualizar o app sem desinstalar.

### Gerar uma versão

Duas opções, ambas pelo navegador:

- **Pela aba Actions**: **Actions → Release Android → Run workflow**, informe a
  versão (`1.0.0`, `1.1.0`…) e confirme. A Release `v1.0.0` só é criada se o build
  der certo.
- **Pelas Releases**: **Releases → Draft a new release**, crie a tag (`v1.0.0`) e
  clique em **Publish release**. O APK é anexado à Release quando o build termina.

Acompanhe em **Actions**; no plano gratuito da Expo o build pode esperar alguns
minutos na fila.

## Configuração Android

- `app.json`: `platforms: ["android"]`, pacote `com.wikihow.app`, ícone adaptativo e splash screen.
- `eas.json`: perfis `development` (dev client, APK), `preview` (APK) e `production` (AAB com `versionCode` incrementado automaticamente).
- A pasta `android/` é gerada (Continuous Native Generation) e está no `.gitignore` — configure tudo pelo `app.json` e config plugins.

