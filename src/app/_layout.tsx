import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';

import { ConteudoProvider } from '@/conteudo';
import { TemaProvider, useTema } from '@/tema';

export default function RootLayout() {
  return (
    <TemaProvider>
      <ConteudoProvider>
        <Navegacao />
      </ConteudoProvider>
    </TemaProvider>
  );
}

function Navegacao() {
  const { cores, escuro } = useTema();

  // Cabeçalhos, fundos e transições da navegação com as cores do app.
  const tema = useMemo<Theme>(() => {
    const base = escuro ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: cores.primaria,
        background: cores.fundo,
        card: cores.fundo,
        text: cores.texto,
        border: cores.borda,
      },
    };
  }, [cores, escuro]);

  return (
    <ThemeProvider value={tema}>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: cores.fundo },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="guia/[id]" options={{ title: '' }} />
      </Stack>
      <StatusBar style={escuro ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
