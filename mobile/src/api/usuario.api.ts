/**
 * Usuário autenticado (dados cadastrais + preferências de acessibilidade).
 * Espelha `frontend/lib/api/usuario.api.ts` + o shape de `Usuario` usado em
 * `frontend/lib/auth/AuthContext.tsx` — só o subconjunto usado no v1
 * (tela de Login/Perfil); busca por CPF/nome fica para a fase de Gestão.
 */
import { API_URL, getHeaders, tratarResposta } from './client';

export type PreferenciaTema = 'light' | 'dark' | 'system';
export type EscalaFonte = 'small' | 'medium' | 'large';

export interface Usuario {
  UsuarioGUID: string;
  UsuarioCPF: string | null;
  UsuarioNome: string;
  UsuarioSobrenome: string;
  UsuarioEmail: string;
  UsuarioTelefone: string;
  UsuarioFotoUrl?: string | null;
  UsuarioTema?: PreferenciaTema;
  UsuarioModoDaltonico?: boolean;
  UsuarioEscalaFonte?: EscalaFonte;
  UsuarioReduzirMovimento?: boolean;
  UsuarioAltoContraste?: boolean;
  UsuarioIsPlataformaAdmin?: boolean;
  UsuarioStatus: 'Ativo' | 'Inativo' | 'Pendente';
}

export interface AtualizarUsuarioDados {
  UsuarioNome?: string;
  UsuarioEmail?: string;
  UsuarioTelefone?: string;
  UsuarioTema?: PreferenciaTema;
  UsuarioModoDaltonico?: boolean;
  UsuarioEscalaFonte?: EscalaFonte;
  UsuarioReduzirMovimento?: boolean;
  UsuarioAltoContraste?: boolean;
}

/**
 * PUT /api/usuario/:UsuarioGUID — usado na tela de Perfil para os toggles de
 * acessibilidade (tema/daltônico/alto contraste), gravando de verdade no
 * cadastro do usuário (não é estado local efêmero). Campos omitidos mantêm
 * o valor existente (PUT parcial).
 */
export async function atualizarUsuario(usuarioGUID: string, dados: AtualizarUsuarioDados): Promise<Usuario> {
  const response = await fetch(`${API_URL}/usuario/${usuarioGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ usuario: dados }),
  });
  const resultado = await tratarResposta<{ usuario: Usuario }>(response, 'Erro ao atualizar dados do usuário');
  return resultado.usuario;
}
