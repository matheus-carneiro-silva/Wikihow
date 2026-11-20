import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';

export default function Home() {
  return (
    <Screen>
      <Text style={styles.title}>Wikihow</Text>
      <Text style={styles.subtitle}>Projeto Expo para Android com Expo Router.</Text>
      <Link href="/sobre" style={styles.link}>
        Ir para Sobre
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center' },
  link: { fontSize: 16, color: '#1a73e8', paddingVertical: 8 },
});
