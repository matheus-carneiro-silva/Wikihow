import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListaGuias } from '@/components/ListaGuias';
import { guias } from '@/conteudo';
import { cores } from '@/tema';

export default function Inicio() {
  return (
    <SafeAreaView edges={['top']} style={styles.tela}>
      <ListaGuias
        guias={guias}
        vazio="Nenhum guia ainda. Adicione arquivos em conteudo/guias."
        cabecalho={
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>Guias</Text>
            <Text style={styles.subtitulo}>
              {guias.length} {guias.length === 1 ? 'guia disponível' : 'guias disponíveis'} offline
              {Constants.expoConfig?.version ? ` · versão ${Constants.expoConfig.version}` : ''}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { gap: 4, marginBottom: 4 },
  titulo: { fontSize: 28, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 14, color: cores.textoSecundario },
});
