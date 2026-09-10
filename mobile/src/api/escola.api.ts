/**
 * Escola (nome, logo, cores da marca) — espelha
 * `frontend/lib/api/escola.api.ts`. As 4 cores (`EscolaCorPriEs/PriCl/
 * SecEs/SecCl`) alimentam `src/theme/theme.ts`.
 */
import { API_URL, getHeaders, tratarResposta } from './client';

export interface Escola {
  EscolaGUID: string;
  EscolaNome: string | null;
  EscolaCNPJ: string | null;
  EscolaTelefone: string | null;
  EscolaEmail: string | null;
  EscolaEndereco: string | null;
  EscolaCorPriEs: string | null;
  EscolaCorPriCl: string | null;
  EscolaCorSecEs: string | null;
  EscolaCorSecCl: string | null;
  EscolaIcone: string | null; // base64
  EscolaStatus: 'Ativa' | 'Inativa';
  EscolaIsTecnica: boolean;
}

export async function buscarEscola(escolaGUID: string): Promise<Escola> {
  const response = await fetch(`${API_URL}/escola/${escolaGUID}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ escola: Escola }>(response, 'Erro ao buscar escola');
  return resultado.escola;
}

/**
 * Escola tal como devolvida por `/api/usuario/:UsuarioGUID/escolas` — o
 * mesmo endpoint que a tela web `/selecionar-escola` usa
 * (`frontend/app/selecionar-escola/page.tsx`). Note que aqui as 4 cores
 * vêm com nomes genéricos `EscolaCor1..4` (alias de
 * `EscolaCorPriEs/PriCl/SecEs/SecCl` feito no próprio SQL do backend —
 * ver `backend/repositories/escolaxusuarioxfuncao.repository.ts`), então
 * é um shape ligeiramente diferente do `Escola` de `/api/escola/:GUID`.
 */
export interface EscolaResumo {
  EscolaGUID: string;
  EscolaNome: string;
  EscolaEmail: string | null;
  EscolaCor1: string | null;
  EscolaCor2: string | null;
  EscolaCor3: string | null;
  EscolaCor4: string | null;
  EscolaLogo: string | null;
  EscolaIcone: string | null; // base64
}

export interface FuncaoVinculo {
  EscolaxUsuarioxFuncaoId: number;
  FuncaoId: number;
  FuncaoNome: string;
  DataInicio: string | null;
  DataFim: string | null;
  Status: 'Ativo' | 'Inativo' | 'Finalizado';
}

export interface EscolaComFuncoes {
  escola: EscolaResumo;
  funcoes: FuncaoVinculo[];
  UltimoAcessoEm: string | null;
}

export async function listarMinhasEscolas(usuarioGUID: string): Promise<EscolaComFuncoes[]> {
  const response = await fetch(`${API_URL}/usuario/${usuarioGUID}/escolas`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ escolas: EscolaComFuncoes[] }>(response, 'Erro ao buscar suas escolas');
  return resultado?.escolas ?? [];
}
