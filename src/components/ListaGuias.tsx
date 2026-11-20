import type { ReactElement } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text } from 'react-native';

import type { Guia } from '@/conteudo';
import { cores } from '@/tema';

import { CartaoGuia } from './CartaoGuia';

type Props = {
  guias: Guia[];
  cabecalho?: ReactElement;
  vazio?: string;
  /** Puxar a lista para baixo chama esta função (ex.: sincronizar). */
  aoAtualizar?: () => void;
  atualizando?: boolean;
};

export function ListaGuias({ guias, cabecalho, vazio = 'Nenhum guia encontrado.', aoAtualizar, atualizando = false }: Props) {
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
      refreshControl={
        aoAtualizar ? (
          <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={[cores.primaria]} />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  conteudo: { padding: 16, gap: 12 },
  vazio: { textAlign: 'center', color: cores.textoSecundario, marginTop: 32, fontSize: 15 },
});
