import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ConteudoProvider } from '@/conteudo';

export default function RootLayout() {
  return (
    <ConteudoProvider>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#fff' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="guia/[id]" options={{ title: '' }} />
      </Stack>
      <StatusBar style="dark" />
    </ConteudoProvider>
  );
}
