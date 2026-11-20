import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useConteudo } from '@/conteudo';
import { useEstilos, type Cores } from '@/tema';

const dataHora = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ` +
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Origem do conteúdo e estado da sincronização com o GitHub. */
export function StatusConteudo() {
  const styles = useEstilos(criarEstilos);
  const { origem, sincronizacao, sincronizar } = useConteudo();
  const [mostrarErros, setMostrarErros] = useState(false);

  const fonte =
    origem.tipo === 'baixado' ? `Guias de ${dataHora(new Date(origem.baixadoEm))}` : 'Guias que vieram com o app';

  let estado: string;
  switch (sincronizacao.fase) {
    case 'sincronizando':
      estado = 'Procurando guias novos…';
      break;
    case 'erro':
      estado = '';
      break;
    default:
      estado = sincronizacao.verificadoEm
        ? sincronizacao.novidades
          ? `${sincronizacao.novidades} arquivo(s) atualizado(s) agora`
          : 'Tudo em dia'
        : '';
  }

  return (
    <View style={styles.container}>
      <Text style={styles.linha}>
        {fonte}
        {estado ? ` · ${estado}` : ''}
      </Text>
      {sincronizacao.fase === 'erro' ? (
        <View style={styles.erro}>
          <Text style={styles.erroTexto}>{sincronizacao.mensagem}</Text>
          {sincronizacao.erros?.length ? (
            <Pressable onPress={() => setMostrarErros((v) => !v)} hitSlop={8}>
              <Text style={styles.acao}>{mostrarErros ? 'Esconder detalhes' : 'Ver detalhes'}</Text>
            </Pressable>
          ) : null}
          {mostrarErros
            ? sincronizacao.erros?.map((e) => (
                <Text key={e} style={styles.erroItem}>
                  • {e}
                </Text>
              ))
            : null}
          <Pressable onPress={sincronizar} hitSlop={8} accessibilityRole="button">
            <Text style={styles.acao}>Tentar de novo</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const criarEstilos = (cores: Cores) =>
  StyleSheet.create({
  container: { gap: 8 },
  linha: { fontSize: 13, color: cores.textoSecundario },
  erro: { backgroundColor: cores.avisoFundo, borderRadius: 10, padding: 12, gap: 6 },
  erroTexto: { fontSize: 14, color: cores.avisoTexto, fontWeight: '600' },
  erroItem: { fontSize: 12, color: cores.avisoTexto, lineHeight: 17 },
  acao: { fontSize: 14, color: cores.primaria, fontWeight: '600' },
});
