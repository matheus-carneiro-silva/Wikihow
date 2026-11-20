import type { ReactElement } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';

import type { Guia } from '@/conteudo';
import { cores } from '@/tema';

import { CartaoGuia } from './CartaoGuia';

type Props = {
  guias: Guia[];
  cabecalho?: ReactElement;
  vazio?: string;
};

export function ListaGuias({ guias, cabecalho, vazio = 'Nenhum guia encontrado.' }: Props) {
  return (
    <FlatList
      data={guias}
      keyExtractor={(g) => g.id}
      renderItem={({ item }) => <CartaoGuia guia={item} />}
      ListHeaderComponent={cabecalho}
      ListEmptyComponent={<Text style={styles.vazio}>{vazio}</Text>}
      contentContainerStyle={styles.conteudo}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    />
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 12 },
  vazio: { textAlign: 'center', color: cores.textoSecundario, marginTop: 32, fontSize: 15 },
});
