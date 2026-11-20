import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';

export default function NotFound() {
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Página não encontrada' }} />
      <Text style={styles.text}>Esta tela não existe.</Text>
      <Link href="/" style={styles.link}>
        Voltar ao início
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 18, fontWeight: '600' },
  link: { fontSize: 16, color: '#1a73e8', paddingVertical: 8 },
});
