import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NOMES_DIFICULDADE, useConteudo, type Guia } from '@/conteudo';
import { cores } from '@/tema';

/** Linha de metadados: "Categoria · 10 min · Fácil · 5 passos". */
export function useMetaGuia() {
  const { obterCategoria } = useConteudo();
  return (guia: Guia) => metaGuia(guia, obterCategoria(guia.categoria)?.nome);
}

function metaGuia(guia: Guia, nomeCategoria: string | undefined): string {
  return [
    nomeCategoria,
    guia.tempoMinutos ? `${guia.tempoMinutos} min` : undefined,
    guia.dificuldade ? NOMES_DIFICULDADE[guia.dificuldade] : undefined,
    `${guia.passos.length} ${guia.passos.length === 1 ? 'passo' : 'passos'}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function CartaoGuia({ guia }: { guia: Guia }) {
  const meta = useMetaGuia();
  return (
    <Link href={{ pathname: '/guia/[id]', params: { id: guia.id } }} asChild>
      <Pressable android_ripple={{ color: cores.primariaSuave }} style={styles.cartao}>
        <Text style={styles.titulo}>{guia.titulo}</Text>
        <Text style={styles.resumo} numberOfLines={2}>
          {guia.resumo}
        </Text>
        <View>
          <Text style={styles.meta}>{meta(guia)}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cartao: {
    backgroundColor: cores.superficie,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    overflow: 'hidden',
  },
  titulo: { fontSize: 17, fontWeight: '700', color: cores.texto },
  resumo: { fontSize: 14, color: cores.textoSecundario, lineHeight: 20 },
  meta: { fontSize: 12, color: cores.primaria, fontWeight: '600' },
});
