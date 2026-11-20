import { StyleSheet, Text, type TextProps } from 'react-native';

import type { Parte } from '@/busca/motor';
import { useEstilos, type Cores } from '@/tema';

type Props = TextProps & { partes: Parte[] };

/** Texto com as palavras encontradas pela busca marcadas. */
export function TextoDestacado({ partes, ...props }: Props) {
  const styles = useEstilos(criarEstilos);
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

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
  destaque: { backgroundColor: cores.destaque, color: cores.texto, fontWeight: '700' },
});
