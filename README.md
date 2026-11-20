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
| `npm run doctor` | Diagnóstico de configuração e dependências |
| `npm run build:apk` | Build de APK na nuvem (perfil `preview`, para testes internos) |
| `npm run build:aab` | Build de AAB na nuvem (perfil `production`, para a Play Store) |

## Navegação (Expo Router)

As rotas ficam em `src/app/` — cada arquivo é uma tela:

```
conteudo/                   # páginas offline em JSON (formato em conteudo/README.md)
├── categorias.json
└── guias/<id>.json
src/
├── app/
│   ├── _layout.tsx         # pilha raiz (Stack)
│   ├── (tabs)/             # grupo de abas (não aparece na URL)
│   │   ├── _layout.tsx     # abas nativas (Material 3 no Android)
│   │   ├── index.tsx       # aba Início: todos os guias, mais recentes primeiro
│   │   └── explorar.tsx    # aba Explorar: busca e filtro por categoria
│   ├── guia/[id].tsx       # rota /guia/<id>: o guia com seus passos
│   └── +not-found.tsx      # rota inexistente
├── conteudo/               # tipos, validação, carregamento e busca do conteúdo
├── components/             # componentes reutilizáveis
└── tema.ts                 # cores
```

- **Conteúdo**: `src/conteudo/index.ts` carrega todos os arquivos de `conteudo/guias/` com `require.context`, então basta criar o arquivo — não há lista para manter.
- **Abas**: usam `NativeTabs` de `expo-router/native-tabs`, que renderiza a barra de navegação nativa do Android. Ícones são [Material Symbols](https://fonts.google.com/icons) passados no `md`. Para adicionar uma aba, crie o arquivo em `src/app/(tabs)/` e um `NativeTabs.Trigger` com o mesmo `name` (máximo de 5 abas).
- **Navegação**: `<Link href={{ pathname: '/guia/[id]', params: { id } }}>` ou `router.push(...)`. Rotas tipadas estão ativas (`experiments.typedRoutes`); os tipos são gerados em `.expo/types` ao rodar `npm start`.
- Imports com o alias `@/` apontam para `src/`.
- Deep links usam o scheme `wikihow://` (ex.: `adb shell am start -a android.intent.action.VIEW -d "wikihow://guia/fazer-cafe-coado"`).

## Configuração Android

- `app.json`: `platforms: ["android"]`, pacote `com.wikihow.app`, ícone adaptativo e splash screen.
- `eas.json`: perfis `development` (dev client, APK), `preview` (APK) e `production` (AAB com `versionCode` incrementado automaticamente).
- A pasta `android/` é gerada (Continuous Native Generation) e está no `.gitignore` — configure tudo pelo `app.json` e config plugins.

