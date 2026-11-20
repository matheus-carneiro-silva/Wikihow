import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { Parte } from '@/busca/motor';
import { useConteudo, type ImagemPasso as Dados } from '@/conteudo';
import { cores } from '@/tema';

import { TextoDestacado } from './TextoDestacado';

type Props = {
  imagem: Dados;
  /** Destaca os termos da busca na legenda. */
  destacar: (texto: string) => Parte[];
};

export function ImagemPasso({ imagem, destacar }: Props) {
  const { obterImagem } = useConteudo();
  const fonte = obterImagem(imagem.arquivo);
  // Proporção real da imagem, para ocupar a largura sem cortar nem distorcer.
  // Imagem embutida: conhecida de antemão. Baixada: lida quando carrega.
  const [proporcaoCarregada, setProporcaoCarregada] = useState<number>();
  if (fonte === undefined) return null; // a validação já acusa o arquivo ausente

  const embutida = typeof fonte === 'number' ? Image.resolveAssetSource(fonte) : undefined;
  const proporcao =
    proporcaoCarregada ?? (embutida?.width && embutida.height ? embutida.width / embutida.height : 16 / 10);

  return (
    <View style={styles.container}>
      <Image
        source={fonte}
        style={[styles.imagem, { aspectRatio: proporcao }]}
        resizeMode="contain"
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (width && height) setProporcaoCarregada(width / height);
        }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={imagem.descricao}
      />
      {imagem.legenda ? <TextoDestacado partes={destacar(imagem.legenda)} style={styles.legenda} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  imagem: { width: '100%', borderRadius: 10, backgroundColor: cores.superficie },
  legenda: { fontSize: 13, color: cores.textoSecundario, textAlign: 'center', lineHeight: 18 },
});
