import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { destacar } from '@/busca/motor';
import { useMetaGuia } from '@/components/CartaoGuia';
import { ImagemPasso } from '@/components/ImagemPasso';
import { Screen } from '@/components/Screen';
import { TextoDestacado } from '@/components/TextoDestacado';
import { useConteudo, type Passo } from '@/conteudo';
import { cores } from '@/tema';

type Params = {
  id: string;
  /** Índice (0-based) do passo para onde rolar, vindo da busca. */
  passo?: string;
  /** Termos da busca a destacar, separados por vírgula. */
  termos?: string;
};

export default function TelaGuia() {
  const { id, passo, termos } = useLocalSearchParams<Params>();
  const { obterGuia } = useConteudo();
  const meta = useMetaGuia();
  const guia = obterGuia(id);
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollViewInstance>(null);
  const jaRolou = useRef(false);

  const alvo = useMemo(() => new Set(termos ? termos.split(',') : []), [termos]);
  const passoAlvo = passo !== undefined ? Number(passo) : undefined;
  const d = (texto: string) => destacar(texto, alvo);

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
        ref={scroll}
        style={styles.tela}
        contentContainerStyle={[styles.conteudo, { paddingBottom: insets.bottom + 24 }]}
      >
        <TextoDestacado partes={d(guia.titulo)} style={styles.titulo} />
        <Text style={styles.meta}>{meta(guia)}</Text>
        <TextoDestacado partes={d(guia.resumo)} style={styles.resumo} />

        {guia.materiais?.length ? (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Você vai precisar de</Text>
            {guia.materiais.map((m) => (
              <TextoDestacado key={m} partes={[{ texto: '•  ', destaque: false }, ...d(m)]} style={styles.item} />
            ))}
          </View>
        ) : null}

        {guia.passos.map((p, i) => (
          <View
            key={i}
            onLayout={(e) => {
              // Rola uma vez até o passo onde a busca encontrou o termo.
              if (i === passoAlvo && !jaRolou.current) {
                jaRolou.current = true;
                scroll.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 12), animated: true });
              }
            }}
          >
            <BlocoPasso numero={i + 1} passo={p} destacado={i === passoAlvo} d={d} />
          </View>
        ))}

        <Text style={styles.rodape}>Atualizado em {formatarData(guia.atualizadoEm)}</Text>
      </ScrollView>
    </>
  );
}

type Destacador = (texto: string) => ReturnType<typeof destacar>;

function BlocoPasso({ numero, passo, destacado, d }: { numero: number; passo: Passo; destacado: boolean; d: Destacador }) {
  return (
    <View style={[styles.passo, destacado && styles.passoDestacado]}>
      <View style={styles.passoTopo}>
        <View style={styles.numero}>
          <Text style={styles.numeroTexto}>{numero}</Text>
        </View>
        <TextoDestacado partes={d(passo.titulo)} style={styles.passoTitulo} />
      </View>
      {passo.imagem ? <ImagemPasso imagem={passo.imagem} destacar={d} /> : null}
      {passo.texto.split(/\n\s*\n/).map((p, i) => (
        <TextoDestacado key={i} partes={d(p.trim())} style={styles.paragrafo} />
      ))}
      {passo.dicas?.map((t) => (
        <Caixa key={t} tipo="dica" texto={t} d={d} />
      ))}
      {passo.avisos?.map((t) => (
        <Caixa key={t} tipo="aviso" texto={t} d={d} />
      ))}
    </View>
  );
}

function Caixa({ tipo, texto, d }: { tipo: 'dica' | 'aviso'; texto: string; d: Destacador }) {
  const dica = tipo === 'dica';
  return (
    <View style={[styles.caixa, { backgroundColor: dica ? cores.dicaFundo : cores.avisoFundo }]}>
      <TextoDestacado
        partes={[{ texto: dica ? 'Dica: ' : 'Atenção: ', destaque: false }, ...d(texto)]}
        style={[styles.caixaTexto, { color: dica ? cores.dicaTexto : cores.avisoTexto }]}
      />
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
  passoDestacado: {
    borderTopWidth: 0,
    borderLeftWidth: 3,
    borderLeftColor: cores.primaria,
    backgroundColor: cores.dicaFundo,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: -12,
  },
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
  rodape: { fontSize: 13, color: cores.textoSecundario, textAlign: 'center', marginTop: 8 },
});
