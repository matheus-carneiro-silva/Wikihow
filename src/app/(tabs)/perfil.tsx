import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';

export default function Perfil() {
  return (
    <Screen>
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.subtitle}>Dados e preferências do usuário.</Text>
      <Link href="/sobre" style={styles.link}>
        Sobre o app
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center' },
  link: { fontSize: 16, color: '#1a73e8', paddingVertical: 8 },
});
