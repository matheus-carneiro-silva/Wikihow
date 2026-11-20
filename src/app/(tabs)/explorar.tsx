import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListaGuias } from '@/components/ListaGuias';
import { buscarGuias, categorias } from '@/conteudo';
import { cores } from '@/tema';

export default function Explorar() {
  const [termo, setTermo] = useState('');
  const [categoria, setCategoria] = useState<string>();
  const resultado = useMemo(() => buscarGuias(termo, categoria), [termo, categoria]);

  return (
    <SafeAreaView edges={['top']} style={styles.tela}>
      <View style={styles.topo}>
        <Text style={styles.titulo}>Explorar</Text>
        <TextInput
          value={termo}
          onChangeText={setTermo}
          placeholder="Buscar guias"
          placeholderTextColor={cores.textoSecundario}
          style={styles.busca}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
        />
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
      <ListaGuias guias={resultado} />
    </SafeAreaView>
  );
}

function Chip({ rotulo, ativo, onPress }: { rotulo: string; ativo: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: cores.primariaSuave, borderless: false }}
      style={[styles.chip, ativo && styles.chipAtivo]}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
    >
      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{rotulo}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  topo: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  titulo: { fontSize: 28, fontWeight: '700', color: cores.texto },
  busca: {
    backgroundColor: cores.superficie,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: cores.texto,
  },
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
});
