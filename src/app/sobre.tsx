import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';

export default function Sobre() {
  return (
    <Screen edges={['bottom']}>
      <Text style={styles.text}>
        Cada arquivo em src/app vira uma tela. Esta é a rota /sobre.
      </Text>
      <Pressable
        onPress={() => router.back()}
        android_ripple={{ color: '#d0e2fc' }}
        style={styles.button}
      >
        <Text style={styles.buttonText}>Voltar</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  text: { fontSize: 16, color: '#333', textAlign: 'center' },
  button: { backgroundColor: '#1a73e8', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
