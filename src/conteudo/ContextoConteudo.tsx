import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { criarMotorDeBusca, type MotorDeBusca } from '../busca/motor';
import { armazenamentoExpo, lerConteudoBaixado, uriImagemBaixada } from './armazenamento';
import { conteudoEmbutido, imagemEmbutida } from './embutido';
import { montarConteudo, type ConteudoMontado } from './montar';
import { ErroSincronizacao, sincronizarConteudo, type ConfigRepositorio } from './sincronizacao';
import type { Categoria, Guia } from './tipos';

const CONFIG: ConfigRepositorio = {
  repositorio: 'matheus-carneiro-silva/Wikihow',
  branch: 'master',
  pasta: 'conteudo',
  ...(Constants.expoConfig?.extra?.conteudo as Partial<ConfigRepositorio> | undefined),
};

export type Origem = { tipo: 'embutido' } | { tipo: 'baixado'; commit: string; baixadoEm: string };

export type EstadoSincronizacao =
  | { fase: 'ociosa'; verificadoEm?: Date; novidades?: number }
  | { fase: 'sincronizando' }
  | { fase: 'erro'; mensagem: string; erros?: string[]; quando: Date };

export type ValorConteudo = {
  guias: Guia[];
  categorias: Categoria[];
  motor: MotorDeBusca;
  origem: Origem;
  obterGuia: (id: string) => Guia | undefined;
  obterCategoria: (id: string) => Categoria | undefined;
  obterImagem: (arquivo: string) => ImageSourcePropType | undefined;
  sincronizacao: EstadoSincronizacao;
  /** Busca guias novos no GitHub; ignorado se já houver uma sincronização em andamento. */
  sincronizar: () => Promise<void>;
};

type Base = { montado: ConteudoMontado; origem: Origem; imagem: (arquivo: string) => ImageSourcePropType | undefined };

if (conteudoEmbutido.erros.length) {
  const mensagem = `Conteúdo embutido inválido:\n- ${conteudoEmbutido.erros.join('\n- ')}`;
  // Em desenvolvimento, falha alto; no APK, só os arquivos inválidos ficam de fora.
  if (__DEV__) throw new Error(mensagem);
  console.warn(mensagem);
}

const BASE_EMBUTIDA: Base = { montado: conteudoEmbutido, origem: { tipo: 'embutido' }, imagem: imagemEmbutida };

const baseBaixada = (montado: ConteudoMontado, commit: string, baixadoEm: string, imagens: Set<string>): Base => ({
  montado,
  origem: { tipo: 'baixado', commit, baixadoEm },
  imagem: (arquivo) => (imagens.has(arquivo) ? { uri: uriImagemBaixada(arquivo) } : undefined),
});

const Contexto = createContext<ValorConteudo | null>(null);

export function ConteudoProvider({ children }: { children: ReactNode }) {
  const [base, setBase] = useState<Base>(BASE_EMBUTIDA);
  const [sincronizacao, setSincronizacao] = useState<EstadoSincronizacao>({ fase: 'ociosa' });
  const emAndamento = useRef(false);

  const sincronizar = useCallback(async () => {
    if (emAndamento.current) return;
    emAndamento.current = true;
    setSincronizacao({ fase: 'sincronizando' });
    try {
      const r = await sincronizarConteudo({ config: CONFIG, armazenamento: armazenamentoExpo, buscar: fetch });
      if (r.tipo === 'atualizado') {
        const imagens = new Set(r.conteudo.guias.flatMap((g) => g.passos.flatMap((p) => (p.imagem ? [p.imagem.arquivo] : []))));
        setBase(baseBaixada(r.conteudo, r.commit, new Date().toISOString(), imagens));
        setSincronizacao({ fase: 'ociosa', verificadoEm: new Date(), novidades: r.baixados });
      } else if (r.tipo === 'sem-mudancas') {
        setSincronizacao({ fase: 'ociosa', verificadoEm: new Date(), novidades: 0 });
      } else {
        setSincronizacao({
          fase: 'erro',
          mensagem: `O conteúdo no GitHub tem ${r.erros.length} erro(s). Mantive a versão atual.`,
          erros: r.erros,
          quando: new Date(),
        });
      }
    } catch (e) {
      const mensagem = e instanceof ErroSincronizacao ? e.message : `Erro inesperado: ${(e as Error).message}`;
      setSincronizacao({ fase: 'erro', mensagem, quando: new Date() });
    } finally {
      emAndamento.current = false;
    }
  }, []);

  // Ao abrir: usa o conteúdo já baixado (se houver e for válido) e procura novidades.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const baixado = await lerConteudoBaixado();
        if (baixado && !cancelado) {
          const montado = montarConteudo(baixado.fonte);
          if (!montado.erros.length) {
            setBase(baseBaixada(montado, baixado.manifesto.commit, baixado.manifesto.baixadoEm, new Set(baixado.fonte.imagens)));
          }
        }
      } catch (e) {
        console.warn('Falha ao ler o conteúdo baixado', e);
      }
      if (!cancelado) await sincronizar();
    })();
    return () => {
      cancelado = true;
    };
  }, [sincronizar]);

  const valor = useMemo<ValorConteudo>(() => {
    const { categorias, guias, sinonimos } = base.montado;
    const porId = new Map(guias.map((g) => [g.id, g]));
    const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
    return {
      guias,
      categorias,
      motor: criarMotorDeBusca(guias, categorias, sinonimos),
      origem: base.origem,
      obterGuia: (id) => porId.get(id),
      obterCategoria: (id) => categoriaPorId.get(id),
      obterImagem: base.imagem,
      sincronizacao,
      sincronizar,
    };
  }, [base, sincronizacao, sincronizar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useConteudo(): ValorConteudo {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useConteudo precisa estar dentro de <ConteudoProvider>.');
  return valor;
}
