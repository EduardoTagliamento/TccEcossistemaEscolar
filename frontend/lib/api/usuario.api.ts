/**
 * API Client para Usuário (dados cadastrais do próprio usuário).
 * Usado pelo painel de "Configuração do usuário" (dropdown do avatar no
 * dashboard) — edição de nome/e-mail/telefone e troca de senha.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface UsuarioAtualizado {
  UsuarioCPF: string;
  UsuarioEmail: string | null;
  UsuarioFotoUrl: string | null;
  UsuarioId: string | null;
  UsuarioTelefone: string | null;
  UsuarioNome: string;
  UsuarioStatus: 'Ativo' | 'Inativo' | 'Bloqueado';
}

/** PUT /api/usuario/:UsuarioCPF — atualiza dado cadastral básico (nome/e-mail/telefone). */
export async function atualizarUsuario(
  usuarioCPF: string,
  dados: { UsuarioNome?: string; UsuarioEmail?: string; UsuarioTelefone?: string }
): Promise<UsuarioAtualizado> {
  const response = await fetch(`${API_URL}/usuario/${usuarioCPF}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ usuario: dados }),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao atualizar dados do usuário');
  }
  return resultado.data.usuario as UsuarioAtualizado;
}

/** PATCH /api/usuario/:UsuarioCPF/senha — exige a senha atual. */
export async function trocarSenha(usuarioCPF: string, senhaAtual: string, novaSenha: string): Promise<void> {
  const response = await fetch(`${API_URL}/usuario/${usuarioCPF}/senha`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ SenhaAtual: senhaAtual, NovaSenha: novaSenha }),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao trocar senha');
  }
}
