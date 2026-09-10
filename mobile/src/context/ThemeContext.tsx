/**
 * Monta o `AppTheme` (ver `src/theme/theme.ts`) a partir da cor real da
 * escola atual (`EscolaContext`) e das preferências de acessibilidade REAIS
 * do usuário (`UsuarioTema`/`UsuarioModoDaltonico`/`UsuarioAltoContraste`,
 * gravadas de verdade em `/api/usuario` — não é estado local efêmero como no
 * mockup de referência). Antes do login, usa o esquema de cor do sistema.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { atualizarUsuario, type PreferenciaTema } from '../api/usuario.api';
import { buildTheme, CORES_ESCOLA_PADRAO, type AppTheme } from '../theme/theme';
import { normalizarHex } from '../theme/colorMath';
import { useAuth } from './AuthContext';
import { useEscola } from './EscolaContext';

interface ThemeContextData {
  theme: AppTheme;
  setTema: (tema: PreferenciaTema) => Promise<void>;
  setDaltonico: (ativo: boolean) => Promise<void>;
  setAltoContraste: (ativo: boolean) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextData | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { usuario, setUsuario } = useAuth();
  const { escola } = useEscola();
  const esquemaSistema = useColorScheme();

  const tema = usuario?.UsuarioTema ?? 'system';
  const dark = tema === 'system' ? esquemaSistema === 'dark' : tema === 'dark';
  const dalton = usuario?.UsuarioModoDaltonico ?? false;
  const altoContraste = usuario?.UsuarioAltoContraste ?? false;

  const theme = useMemo(
    () =>
      buildTheme(
        escola
          ? {
              primariaEscura: escola.EscolaCor1 ? normalizarHex(escola.EscolaCor1) : CORES_ESCOLA_PADRAO.primariaEscura,
              primariaClara: escola.EscolaCor2 ? normalizarHex(escola.EscolaCor2) : CORES_ESCOLA_PADRAO.primariaClara,
              secundariaEscura: escola.EscolaCor3 ? normalizarHex(escola.EscolaCor3) : CORES_ESCOLA_PADRAO.secundariaEscura,
              secundariaClara: escola.EscolaCor4 ? normalizarHex(escola.EscolaCor4) : CORES_ESCOLA_PADRAO.secundariaClara,
            }
          : CORES_ESCOLA_PADRAO,
        { dark, dalton, altoContraste }
      ),
    [escola, dark, dalton, altoContraste]
  );

  async function persistirPreferencia(dados: Parameters<typeof atualizarUsuario>[1]) {
    if (!usuario) return;
    // Otimista: aplica local antes da resposta do servidor voltar, pra não
    // travar o toggle esperando a rede.
    setUsuario({ ...usuario, ...dados });
    try {
      const atualizado = await atualizarUsuario(usuario.UsuarioGUID, dados);
      setUsuario({ ...usuario, ...atualizado });
    } catch (error) {
      console.warn('Erro ao salvar preferência de acessibilidade:', error);
    }
  }

  const setTema = (novoTema: PreferenciaTema) => persistirPreferencia({ UsuarioTema: novoTema });
  const setDaltonico = (ativo: boolean) => persistirPreferencia({ UsuarioModoDaltonico: ativo });
  const setAltoContraste = (ativo: boolean) => persistirPreferencia({ UsuarioAltoContraste: ativo });

  return (
    <ThemeContext.Provider value={{ theme, setTema, setDaltonico, setAltoContraste }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme(): ThemeContextData {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
}
