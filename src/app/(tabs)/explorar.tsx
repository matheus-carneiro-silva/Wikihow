import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';

export default function Explorar() {
  return (
    <Screen>
      <Text style={styles.title}>Explorar</Text>
      <Text style={styles.subtitle}>Aqui vão os conteúdos para descobrir.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 16, color: '#555', textAlign: 'center' },
});
