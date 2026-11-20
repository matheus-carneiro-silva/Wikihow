import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { metaGuia } from '@/components/CartaoGuia';
import { Screen } from '@/components/Screen';
import { obterGuia, type Passo } from '@/conteudo';
import { cores } from '@/tema';

export default function TelaGuia() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guia = obterGuia(id);
  const insets = useSafeAreaInsets();

  if (!guia) {
    return (
      <Screen edges={['bottom']}>
        <Stack.Screen options={{ title: 'Guia não encontrado' }} />
        <Text style={styles.paragrafo}>Não existe guia com o id "{id}".</Text>
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: guia.titulo }} />
      <ScrollView
        style={styles.tela}
        contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={styles.titulo}>{guia.titulo}</Text>
        <Text style={styles.meta}>{metaGuia(guia)}</Text>
        <Text style={styles.resumo}>{guia.resumo}</Text>

        {guia.materiais?.length ? (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Você vai precisar de</Text>
            {guia.materiais.map((m) => (
              <Text key={m} style={styles.item}>
                •  {m}
              </Text>
            ))}
          </View>
        ) : null}

        {guia.passos.map((passo, i) => (
          <BlocoPasso key={i} numero={i + 1} passo={passo} />
        ))}

        <Text style={styles.rodape}>Atualizado em {formatarData(guia.atualizadoEm)}</Text>
      </ScrollView>
    </>
  );
}

function BlocoPasso({ numero, passo }: { numero: number; passo: Passo }) {
  return (
    <View style={styles.passo}>
      <View style={styles.passoTopo}>
        <View style={styles.numero}>
          <Text style={styles.numeroTexto}>{numero}</Text>
        </View>
        <Text style={styles.passoTitulo}>{passo.titulo}</Text>
      </View>
      {passo.texto.split(/\n\s*\n/).map((p, i) => (
        <Text key={i} style={styles.paragrafo}>
          {p.trim()}
        </Text>
      ))}
      {passo.dicas?.map((d) => (
        <Caixa key={d} tipo="dica" texto={d} />
      ))}
      {passo.avisos?.map((a) => (
        <Caixa key={a} tipo="aviso" texto={a} />
      ))}
    </View>
  );
}

function Caixa({ tipo, texto }: { tipo: 'dica' | 'aviso'; texto: string }) {
  const dica = tipo === 'dica';
  return (
    <View style={[styles.caixa, { backgroundColor: dica ? cores.dicaFundo : cores.avisoFundo }]}>
      <Text style={[styles.caixaTexto, { color: dica ? cores.dicaTexto : cores.avisoTexto }]}>
        <Text style={styles.caixaRotulo}>{dica ? 'Dica: ' : 'Atenção: '}</Text>
        {texto}
      </Text>
    </View>
  );
}

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: 20, gap: 16 },
  titulo: { fontSize: 26, fontWeight: '700', color: cores.texto },
  meta: { fontSize: 13, color: cores.primaria, fontWeight: '600', marginTop: -8 },
  resumo: { fontSize: 16, color: cores.textoSecundario, lineHeight: 23 },
  secao: { backgroundColor: cores.superficie, borderRadius: 12, padding: 16, gap: 6 },
  secaoTitulo: { fontSize: 15, fontWeight: '700', color: cores.texto, marginBottom: 2 },
  item: { fontSize: 15, color: cores.texto, lineHeight: 22 },
  passo: { gap: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cores.borda },
  passoTopo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  numero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroTexto: { color: '#fff', fontWeight: '700', fontSize: 15 },
  passoTitulo: { flex: 1, fontSize: 18, fontWeight: '700', color: cores.texto },
  paragrafo: { fontSize: 16, color: cores.texto, lineHeight: 24 },
  caixa: { borderRadius: 10, padding: 12 },
  caixaTexto: { fontSize: 15, lineHeight: 22 },
  caixaRotulo: { fontWeight: '700' },
  rodape: { fontSize: 13, color: cores.textoSecundario, textAlign: 'center', marginTop: 8 },
});
