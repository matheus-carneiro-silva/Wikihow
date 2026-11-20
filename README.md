# Wikihow

App pessoal de guias passo a passo ("como fazer"), feito com [Expo](https://expo.dev) (SDK 58, React Native 0.88, TypeScript), **exclusivamente para Android** e **100% offline**: todos os guias são arquivos JSON em [`conteudo/`](conteudo/README.md) embutidos no app.

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

## Navegação (Expo Router)

As rotas ficam em `src/app/` — cada arquivo é uma tela:

```
conteudo/                   # páginas offline em JSON (formato em conteudo/README.md)
├── categorias.json
├── sinonimos.json
└── guias/<id>.json
src/
├── app/
│   ├── _layout.tsx         # pilha raiz (Stack)
│   ├── (tabs)/             # grupo de abas (não aparece na URL)
│   │   ├── _layout.tsx     # abas nativas (Material 3 no Android)
│   │   ├── index.tsx       # aba Início: todos os guias, mais recentes primeiro
│   │   └── explorar.tsx    # aba Explorar: busca com trechos destacados e filtro por categoria
│   ├── guia/[id].tsx       # rota /guia/<id>: o guia com seus passos (rola até ?passo=N)
│   └── +not-found.tsx      # rota inexistente
├── busca/motor.ts          # motor de busca (MiniSearch + stemming em português)
├── conteudo/               # tipos, validação e carregamento do conteúdo
├── components/             # componentes reutilizáveis
└── tema.ts                 # cores
```

- **Conteúdo**: `src/conteudo/index.ts` carrega todos os arquivos de `conteudo/guias/` com `require.context`, então basta criar o arquivo — não há lista para manter.
- **Busca**: detalhes de como funciona e de como escrever conteúdo que a busca encontra bem em [`conteudo/README.md`](conteudo/README.md#como-a-busca-usa-o-conteúdo). Testes em `testes/`.
- **Abas**: usam `NativeTabs` de `expo-router/native-tabs`, que renderiza a barra de navegação nativa do Android. Ícones são [Material Symbols](https://fonts.google.com/icons) passados no `md`. Para adicionar uma aba, crie o arquivo em `src/app/(tabs)/` e um `NativeTabs.Trigger` com o mesmo `name` (máximo de 5 abas).
- **Navegação**: `<Link href={{ pathname: '/guia/[id]', params: { id } }}>` ou `router.push(...)`. Rotas tipadas estão ativas (`experiments.typedRoutes`); os tipos são gerados em `.expo/types` ao rodar `npm start`.
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

1. Crie uma conta em [expo.dev](https://expo.dev).
2. No computador, dentro do projeto:
   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest init          # liga o projeto à sua conta (grava projectId e owner no app.json)
   npx eas-cli@latest credentials -p android
   ```
   No `credentials`, escolha o perfil `production` e gere uma nova keystore. A Expo
   guarda essa chave; todas as versões serão assinadas com ela, o que permite
   atualizar o app sem desinstalar.
3. Faça commit e push do `app.json` alterado pelo `init`.
4. Em expo.dev, vá em **Account settings → Access tokens** e crie um token.
5. No GitHub, em **Settings → Secrets and variables → Actions**, crie o secret
   `EXPO_TOKEN` com esse token.

### Gerar uma versão

No GitHub: **Releases → Draft a new release**, crie a tag (`v1.0.0`, `v1.1.0`…)
e clique em **Publish release**. Acompanhe em **Actions**; no plano gratuito da Expo
o build pode esperar alguns minutos na fila.

## Configuração Android

- `app.json`: `platforms: ["android"]`, pacote `com.wikihow.app`, ícone adaptativo e splash screen.
- `eas.json`: perfis `development` (dev client, APK), `preview` (APK) e `production` (AAB com `versionCode` incrementado automaticamente).
- A pasta `android/` é gerada (Continuous Native Generation) e está no `.gitignore` — configure tudo pelo `app.json` e config plugins.

