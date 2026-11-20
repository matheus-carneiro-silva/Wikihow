import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  /**
   * Bordas que precisam de área segura. Telas dentro das abas usam o padrão
   * ['top'] (as abas nativas do Android já tratam a base). Telas da pilha com
   * cabeçalho devem usar ['bottom'] (o cabeçalho já trata o topo).
   */
  edges?: Edge[];
};

export function Screen({ children, edges = ['top'] }: Props) {
  return (
    <SafeAreaView edges={edges} style={styles.container}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
});
