import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: '#fff' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sobre" options={{ title: 'Sobre' }} />
      </Stack>
      <StatusBar style="dark" />
    </>
  );
}
