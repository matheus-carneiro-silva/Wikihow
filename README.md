# Wikihow

App mobile feito com [Expo](https://expo.dev) (SDK 58, React Native 0.88, TypeScript), configurado **exclusivamente para Android**.

## Pré-requisitos

- Node.js 20+
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
| `npm run doctor` | Diagnóstico de configuração e dependências |
| `npm run build:apk` | Build de APK na nuvem (perfil `preview`, para testes internos) |
| `npm run build:aab` | Build de AAB na nuvem (perfil `production`, para a Play Store) |

## Navegação (Expo Router)

As rotas ficam em `src/app/` — cada arquivo é uma tela:

```
src/
├── app/
│   ├── _layout.tsx         # pilha raiz (Stack)
│   ├── (tabs)/             # grupo de abas (não aparece na URL)
│   │   ├── _layout.tsx     # abas nativas (Material 3 no Android)
│   │   ├── index.tsx       # aba Início  → rota /
│   │   ├── explorar.tsx    # aba Explorar → rota /explorar
│   │   └── perfil.tsx      # aba Perfil  → rota /perfil
│   ├── sobre.tsx           # rota /sobre (abre por cima das abas, com cabeçalho)
│   └── +not-found.tsx      # rota inexistente
└── components/             # código que não é rota (componentes, hooks, utils)
```

- **Abas**: usam `NativeTabs` de `expo-router/native-tabs`, que renderiza a barra de navegação nativa do Android. Ícones são [Material Symbols](https://fonts.google.com/icons) passados no `md` (ex.: `<NativeTabs.Trigger.Icon md="home" />`). Para adicionar uma aba, crie o arquivo em `src/app/(tabs)/` e um `NativeTabs.Trigger` com o mesmo `name`. O Android aceita no máximo 5 abas.
- **Área segura**: use o componente `Screen`. Nas abas o padrão (`edges={['top']}`) já serve; em telas da pilha com cabeçalho, passe `edges={['bottom']}`.
- Navegue com `<Link href="/sobre">` ou `router.push('/sobre')` (importados de `expo-router`).
- Rotas tipadas estão ativas (`experiments.typedRoutes`): um `href` inválido gera erro de TypeScript. Os tipos são gerados em `.expo/types` ao rodar `npm start`.
- Imports com o alias `@/` apontam para `src/` (ex.: `import { Screen } from '@/components/Screen'`).
- Deep links usam o scheme `wikihow://` (ex.: `adb shell am start -a android.intent.action.VIEW -d "wikihow://sobre"`).

## Configuração Android

- `app.json`: `platforms: ["android"]`, pacote `com.wikihow.app`, ícone adaptativo e splash screen.
- `eas.json`: perfis `development` (dev client, APK), `preview` (APK) e `production` (AAB com `versionCode` incrementado automaticamente).
- A pasta `android/` é gerada (Continuous Native Generation) e está no `.gitignore` — configure tudo pelo `app.json` e config plugins.

> Antes de publicar, troque o `android.package` (`com.wikihow.app`) por um identificador do seu domínio — ele não pode ser alterado depois que o app sobe na Play Store.
