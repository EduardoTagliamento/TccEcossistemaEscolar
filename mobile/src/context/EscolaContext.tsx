/**
 * Escola atual do usuário (cor/nome/logo) + papel nela. Espelha o fluxo da
 * tela web `/selecionar-escola` (`frontend/app/selecionar-escola/page.tsx`):
 * um único `GET /api/usuario/:UsuarioGUID/escolas` já devolve escola +
 * função por vínculo, sem precisar de chamadas extras por escola.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { listarMinhasEscolas, type EscolaComFuncoes } from '../api/escola.api';
import { useAuth } from './AuthContext';

const ESCOLA_KEY = 'baua_escola_guid';

interface EscolaContextData {
  escola: EscolaComFuncoes['escola'] | null;
  funcao: string | null;
  opcoes: EscolaComFuncoes[];
  precisaSelecionar: boolean;
  isLoading: boolean;
  selecionarEscola: (escolaGUID: string) => Promise<void>;
}

const EscolaContext = createContext<EscolaContextData>({} as EscolaContextData);

export function EscolaProvider({ children }: { children: React.ReactNode }) {
  const { usuario, isAuthenticated } = useAuth();
  const [escola, setEscola] = useState<EscolaComFuncoes['escola'] | null>(null);
  const [funcao, setFuncao] = useState<string | null>(null);
  const [opcoes, setOpcoes] = useState<EscolaComFuncoes[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !usuario) {
      setEscola(null);
      setFuncao(null);
      setOpcoes([]);
      setIsLoading(false);
      return;
    }

    (async () => {
      setIsLoading(true);
      try {
        const escolas = await listarMinhasEscolas(usuario.UsuarioGUID);
        setOpcoes(escolas);

        const guidPersistido = await SecureStore.getItemAsync(ESCOLA_KEY);
        const persistidaValida = escolas.find((v) => v.escola.EscolaGUID === guidPersistido);

        if (persistidaValida) {
          selecionarLocal(persistidaValida);
        } else if (escolas.length === 1) {
          await SecureStore.setItemAsync(ESCOLA_KEY, escolas[0].escola.EscolaGUID);
          selecionarLocal(escolas[0]);
        }
        // Se houver >1 opção e nenhuma persistida, `precisaSelecionar` fica
        // true e a navegação mostra a tela de seleção de escola.
      } catch (error) {
        console.warn('Erro ao carregar escolas do usuário:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [isAuthenticated, usuario?.UsuarioGUID]);

  function selecionarLocal(item: EscolaComFuncoes) {
    setEscola(item.escola);
    setFuncao(item.funcoes[0]?.FuncaoNome ?? null);
  }

  async function selecionarEscola(escolaGUID: string) {
    const item = opcoes.find((v) => v.escola.EscolaGUID === escolaGUID);
    if (!item) return;
    await SecureStore.setItemAsync(ESCOLA_KEY, escolaGUID);
    selecionarLocal(item);
  }

  return (
    <EscolaContext.Provider
      value={{
        escola,
        funcao,
        opcoes,
        precisaSelecionar: !isLoading && !escola && opcoes.length > 1,
        isLoading,
        selecionarEscola,
      }}
    >
      {children}
    </EscolaContext.Provider>
  );
}

export function useEscola(): EscolaContextData {
  const context = useContext(EscolaContext);
  if (!context) {
    throw new Error('useEscola deve ser usado dentro de um EscolaProvider');
  }
  return context;
}
