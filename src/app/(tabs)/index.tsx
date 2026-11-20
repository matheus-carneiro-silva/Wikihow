import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ListaGuias } from '@/components/ListaGuias';
import { StatusConteudo } from '@/components/StatusConteudo';
import { useConteudo } from '@/conteudo';
import { useEstilos, type Cores } from '@/tema';

export default function Inicio() {
  const styles = useEstilos(criarEstilos);
  const { guias, sincronizacao, sincronizar } = useConteudo();
  return (
    <SafeAreaView edges={['top']} style={styles.tela}>
      <ListaGuias
        guias={guias}
        vazio="Nenhum guia ainda. Puxe a lista para baixo para buscar no GitHub."
        aoAtualizar={sincronizar}
        atualizando={sincronizacao.fase === 'sincronizando'}
        cabecalho={
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>Guias</Text>
            <Text style={styles.subtitulo}>
              {guias.length} {guias.length === 1 ? 'guia disponível' : 'guias disponíveis'} offline
              {Constants.expoConfig?.version ? ` · versão ${Constants.expoConfig.version}` : ''}
            </Text>
            <StatusConteudo />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  cabecalho: { gap: 4, marginBottom: 4 },
  titulo: { fontSize: 28, fontWeight: '700', color: cores.texto },
  subtitulo: { fontSize: 14, color: cores.textoSecundario },
});
