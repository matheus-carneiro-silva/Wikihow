import { useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartaoResultado } from '@/components/CartaoResultado';
import { useConteudo } from '@/conteudo';
import { useEstilos, useTema, type Cores } from '@/tema';

export default function Explorar() {
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  const { categorias, motor } = useConteudo();
  const [termo, setTermo] = useState('');
  const [categoria, setCategoria] = useState<string>();
  // A busca roda sem travar a digitação.
  const termoAdiado = useDeferredValue(termo);
  const { resultados, parcial } = useMemo(
    () => motor.buscar(termoAdiado, { categoria }),
    [motor, termoAdiado, categoria],
  );
  const buscando = termoAdiado.trim().length > 0;

  return (
    <SafeAreaView edges={['top']} style={styles.tela}>
      <View style={styles.topo}>
        <Text style={styles.titulo}>Explorar</Text>
        <View style={styles.campo}>
          <TextInput
            value={termo}
            onChangeText={setTermo}
            placeholder="O que você quer fazer?"
            placeholderTextColor={cores.textoSecundario}
            style={styles.busca}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
            accessibilityLabel="Buscar guias"
          />
          {termo ? (
            <Pressable
              onPress={() => setTermo('')}
              hitSlop={12}
              style={styles.limpar}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <Text style={styles.limparTexto}>✕</Text>
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip rotulo="Todas" ativo={!categoria} onPress={() => setCategoria(undefined)} />
          {categorias.map((c) => (
            <Chip
              key={c.id}
              rotulo={c.nome}
              ativo={categoria === c.id}
              onPress={() => setCategoria(categoria === c.id ? undefined : c.id)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={resultados}
        keyExtractor={(r) => r.guia.id}
        renderItem={({ item }) => <CartaoResultado resultado={item} />}
        contentContainerStyle={styles.lista}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          buscando && resultados.length ? (
            <Text style={styles.aviso}>
              {parcial
                ? 'Nenhum guia tem todas as palavras. Mostrando os que têm alguma.'
                : `${resultados.length} ${resultados.length === 1 ? 'resultado' : 'resultados'}`}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          <Text style={styles.vazio}>
            {buscando ? `Nada encontrado para "${termoAdiado.trim()}".` : 'Nenhum guia nesta categoria.'}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  const { cores } = useTema();
  const styles = useEstilos(criarEstilos);
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: cores.primariaSuave }}
      style={[styles.chip, ativo && styles.chipAtivo]}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
    >
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  titulo: { fontSize: 28, fontWeight: '700', color: cores.texto },
  campo: { justifyContent: 'center' },
  busca: {
    backgroundColor: cores.superficie,
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 44,
    paddingVertical: 10,
    fontSize: 16,
    color: cores.texto,
  },
  limpar: { position: 'absolute', right: 14 },
  limparTexto: { fontSize: 16, color: cores.textoSecundario },
  chips: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: cores.borda,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  chipAtivo: { backgroundColor: cores.primariaSuave, borderColor: cores.primariaSuave },
  chipTexto: { fontSize: 14, color: cores.texto },
  chipTextoAtivo: { color: cores.dicaTexto, fontWeight: '600' },
  lista: { padding: 16, gap: 12 },
  aviso: { fontSize: 13, color: cores.textoSecundario },
  vazio: { textAlign: 'center', color: cores.textoSecundario, marginTop: 32, fontSize: 15 },
});
