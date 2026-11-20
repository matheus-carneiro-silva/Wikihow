import Constants from 'expo-constants';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useConteudo } from '@/conteudo';
import { OPCOES_TEMA, useEstilos, useTema, type Cores } from '@/tema';

export default function Ajustes() {
  const styles = useEstilos(criarEstilos);
  const { cores, preferencia, definirPreferencia } = useTema();
  const { origem, guias } = useConteudo();

  return (
    <SafeAreaView edges={['top']} style={styles.tela}>
      <ScrollView contentContainerStyle={styles.conteudo}>
        <Text style={styles.titulo}>Ajustes</Text>

        <Text style={styles.secao}>Tema</Text>
        <View style={styles.grupo} accessibilityRole="radiogroup">
          {OPCOES_TEMA.map((opcao, i) => {
            const marcado = preferencia === opcao.valor;
            return (
              <Pressable
                key={opcao.valor}
                onPress={() => definirPreferencia(opcao.valor)}
                android_ripple={{ color: cores.primariaSuave }}
                style={[styles.opcao, i > 0 && styles.divisor]}
                accessibilityRole="radio"
                accessibilityState={{ checked: marcado }}
              >
                <View style={styles.opcaoTextos}>
                  <Text style={styles.opcaoRotulo}>{opcao.rotulo}</Text>
                  <Text style={styles.opcaoDescricao}>{opcao.descricao}</Text>
                </View>
                <View style={[styles.radio, marcado && styles.radioMarcado]}>
                  {marcado ? <View style={styles.radioPonto} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.secao}>Sobre</Text>
        <View style={styles.grupo}>
          <Linha rotulo="Versão" valor={Constants.expoConfig?.version ?? '-'} />
          <Linha rotulo="Guias" valor={String(guias.length)} divisor />
          <Linha
            rotulo="Conteúdo"
            valor={origem.tipo === 'baixado' ? `GitHub (${origem.commit.slice(0, 7)})` : 'Embutido no app'}
            divisor
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Linha({ rotulo, valor, divisor }: { rotulo: string; valor: string; divisor?: boolean }) {
  const styles = useEstilos(criarEstilos);
  return (
    <View style={[styles.linha, divisor && styles.divisor]}>
      <Text style={styles.opcaoRotulo}>{rotulo}</Text>
      <Text style={styles.linhaValor}>{valor}</Text>
    </View>
  );
}

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { padding: 16, gap: 8 },
    titulo: { fontSize: 28, fontWeight: '700', color: cores.texto, marginBottom: 8 },
    secao: { fontSize: 13, fontWeight: '700', color: cores.primaria, marginTop: 12, marginLeft: 4 },
    grupo: { backgroundColor: cores.superficie, borderRadius: 12, overflow: 'hidden' },
    divisor: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.borda },
    opcao: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    opcaoTextos: { flex: 1, gap: 2 },
    opcaoRotulo: { fontSize: 16, color: cores.texto },
    opcaoDescricao: { fontSize: 13, color: cores.textoSecundario },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: cores.textoSecundario,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioMarcado: { borderColor: cores.primaria },
    radioPonto: { width: 11, height: 11, borderRadius: 6, backgroundColor: cores.primaria },
    linha: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    linhaValor: { fontSize: 15, color: cores.textoSecundario, flexShrink: 1, textAlign: 'right' },
  });
