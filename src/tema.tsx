/**
 * Tema do app: paletas clara e escura e a preferência do usuário
 * ("sistema", "claro" ou "escuro"; padrão: seguir o aparelho).
 */
import { File, Paths } from 'expo-file-system';
import * as SystemUI from 'expo-system-ui';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

const claro = {
  fundo: '#ffffff',
  superficie: '#f4f6f9',
  texto: '#1b1f24',
  textoSecundario: '#5c6670',
  borda: '#e1e5ea',
  primaria: '#1967d2',
  primariaSuave: '#d0e2fc',
  /** Texto sobre a cor primária (ex.: número do passo). */
  sobrePrimaria: '#ffffff',
  dicaFundo: '#e8f1fd',
  dicaTexto: '#174ea6',
  avisoFundo: '#fdf0e3',
  avisoTexto: '#8a4b08',
  destaque: '#fff0a8',
};

export type Cores = typeof claro;

const escuro: Cores = {
  fundo: '#121316',
  superficie: '#1e2125',
  texto: '#e6e8eb',
  textoSecundario: '#a0a7af',
  borda: '#33373d',
  primaria: '#8ab4f8',
  primariaSuave: '#2b3d5c',
  sobrePrimaria: '#0b1d3a',
  dicaFundo: '#172a45',
  dicaTexto: '#a8c7fa',
  avisoFundo: '#3b2a14',
  avisoTexto: '#fbc57a',
  destaque: '#6b5800',
};

export const paletas = { claro, escuro } as const;

export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';
export const OPCOES_TEMA: { valor: PreferenciaTema; rotulo: string; descricao: string }[] = [
  { valor: 'sistema', rotulo: 'Padrão do sistema', descricao: 'Segue o tema claro ou escuro do Android' },
  { valor: 'claro', rotulo: 'Claro', descricao: 'Sempre claro' },
  { valor: 'escuro', rotulo: 'Escuro', descricao: 'Sempre escuro' },
];

// --- Preferência salva no aparelho -----------------------------------------

const arquivoPreferencias = () => new File(Paths.document, 'preferencias.json');

function lerPreferencia(): PreferenciaTema {
  try {
    const f = arquivoPreferencias();
    if (!f.exists) return 'sistema';
    const tema = (JSON.parse(f.textSync()) as { tema?: unknown }).tema;
    return tema === 'claro' || tema === 'escuro' ? tema : 'sistema';
  } catch {
    return 'sistema';
  }
}

function salvarPreferencia(tema: PreferenciaTema) {
  try {
    arquivoPreferencias().writeSync(JSON.stringify({ tema }));
  } catch (e) {
    console.warn('Não foi possível salvar o tema', e);
  }
}

const aplicarNoSistema = (tema: PreferenciaTema) =>
  Appearance.setColorScheme(tema === 'sistema' ? 'unspecified' : tema === 'claro' ? 'light' : 'dark');

// Lida antes da primeira tela, para o app não abrir no tema errado e trocar em seguida.
const PREFERENCIA_INICIAL = lerPreferencia();
aplicarNoSistema(PREFERENCIA_INICIAL);

// --- Contexto ----------------------------------------------------------------

type ValorTema = {
  cores: Cores;
  escuro: boolean;
  preferencia: PreferenciaTema;
  definirPreferencia: (tema: PreferenciaTema) => void;
};

const Contexto = createContext<ValorTema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(PREFERENCIA_INICIAL);
  const sistema = useColorScheme();
  const ehEscuro = preferencia === 'escuro' || (preferencia === 'sistema' && sistema === 'dark');
  const cores = ehEscuro ? escuro : claro;

  const definirPreferencia = useCallback((tema: PreferenciaTema) => {
    setPreferencia(tema);
    aplicarNoSistema(tema);
    salvarPreferencia(tema);
  }, []);

  // Fundo da janela nativa (aparece durante transições e no teclado).
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(cores.fundo).catch(() => {});
  }, [cores]);

  const valor = useMemo(
    () => ({ cores, escuro: ehEscuro, preferencia, definirPreferencia }),
    [cores, ehEscuro, preferencia, definirPreferencia],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): ValorTema {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useTema precisa estar dentro de <TemaProvider>.');
  return valor;
}

const cacheEstilos = new WeakMap<object, Map<Cores, unknown>>();

/**
 * Estilos que dependem do tema. `fabrica` deve ser definida fora do componente;
 * o resultado fica em cache por paleta, então o StyleSheet é criado uma vez só.
 */
export function useEstilos<T>(fabrica: (cores: Cores) => T): T {
  const { cores } = useTema();
  let porPaleta = cacheEstilos.get(fabrica);
  if (!porPaleta) cacheEstilos.set(fabrica, (porPaleta = new Map()));
  if (!porPaleta.has(cores)) porPaleta.set(cores, fabrica(cores));
  return porPaleta.get(cores) as T;
}
