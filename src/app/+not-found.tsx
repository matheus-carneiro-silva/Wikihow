import { Link, Stack } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { useEstilos, type Cores } from '@/tema';

export default function NotFound() {
  const styles = useEstilos(criarEstilos);
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

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
  text: { fontSize: 18, fontWeight: '600', color: cores.texto },
  link: { fontSize: 16, color: cores.primaria, paddingVertical: 8 },
});
