import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { ResultadoBusca } from '@/busca/motor';
import { cores } from '@/tema';

import { metaGuia } from './CartaoGuia';
import { TextoDestacado } from './TextoDestacado';

export function CartaoResultado({ resultado }: { resultado: ResultadoBusca }) {
  const { guia, titulo, trecho, termos } = resultado;
  const params: { id: string; passo?: string; termos?: string } = { id: guia.id };
  if (trecho.passo !== undefined) params.passo = String(trecho.passo);
  if (termos.length) params.termos = termos.join(',');

  return (
    <Link href={{ pathname: '/guia/[id]', params }} asChild>
      <Pressable android_ripple={{ color: cores.primariaSuave }} style={styles.cartao}>
        <TextoDestacado partes={titulo} style={styles.titulo} />
        {trecho.rotulo ? <TextoDestacado partes={trecho.rotulo} style={styles.rotulo} numberOfLines={1} /> : null}
        <TextoDestacado partes={trecho.partes} style={styles.trecho} numberOfLines={3} />
        <Text style={styles.meta}>{metaGuia(guia)}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  cartao: { backgroundColor: cores.superficie, borderRadius: 12, padding: 16, gap: 6, overflow: 'hidden' },
  titulo: { fontSize: 17, fontWeight: '700', color: cores.texto },
  rotulo: { fontSize: 13, fontWeight: '600', color: cores.dicaTexto },
  trecho: { fontSize: 14, color: cores.textoSecundario, lineHeight: 20 },
  meta: { fontSize: 12, color: cores.primaria, fontWeight: '600' },
});
