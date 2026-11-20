import Constants from 'expo-constants';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartaoGuia } from '@/components/CartaoGuia';
import { ListaGuias } from '@/components/ListaGuias';
import { StatusConteudo } from '@/components/StatusConteudo';
import { useConteudo } from '@/conteudo';
import { useEstilos, type Cores } from '@/tema';

export default function Inicio() {
  const styles = useEstilos(criarEstilos);
  const { guias, sincronizacao, sincronizar } = useConteudo();
  // Guias marcados com "destaque" ficam numa seção própria no topo, em ordem.
  const [destaques, demais] = useMemo(() => {
    const d = guias.filter((g) => g.destaque !== undefined).sort((a, b) => a.destaque! - b.destaque!);
    return [d, guias.filter((g) => g.destaque === undefined)];
  }, [guias]);
  return (
    <SafeAreaView edges={['top']} style={styles.tela}>
      <ListaGuias
        guias={demais}
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
            {destaques.length ? (
              <View style={styles.destaques}>
                <Text style={styles.secao}>Comece por aqui</Text>
                {destaques.map((g) => (
                  <View key={g.id} style={styles.cartaoDestaque}>
                    <CartaoGuia guia={g} />
                  </View>
                ))}
                <Text style={styles.secao}>Todos os guias</Text>
              </View>
            ) : null}
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
  destaques: { gap: 10, marginTop: 12 },
  secao: { fontSize: 13, fontWeight: '700', color: cores.primaria, marginLeft: 4 },
  cartaoDestaque: { borderWidth: 2, borderColor: cores.primaria, borderRadius: 14 },
});
