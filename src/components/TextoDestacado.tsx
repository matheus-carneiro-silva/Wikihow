import { StyleSheet, Text, type TextProps } from 'react-native';

import type { Parte } from '@/busca/motor';
import { cores } from '@/tema';

type Props = TextProps & { partes: Parte[] };

/** Texto com as palavras encontradas pela busca marcadas. */
export function TextoDestacado({ partes, ...props }: Props) {
  return (
    <Text {...props}>
      {partes.map((p, i) =>
        p.destaque ? (
          <Text key={i} style={styles.destaque}>
            {p.texto}
          </Text>
        ) : (
          p.texto
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  destaque: { backgroundColor: cores.destaque, color: cores.texto, fontWeight: '700' },
});
