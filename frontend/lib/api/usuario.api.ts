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

export interface UsuarioBusca {
  UsuarioCPF: string;
  UsuarioNome: string;
  UsuarioEmail: string | null;
  UsuarioTelefone: string | null;
  UsuarioStatus: 'Ativo' | 'Inativo' | 'Bloqueado';
}

/**
 * GET /api/usuario/:UsuarioCPF — busca um usuário já cadastrado na plataforma
 * (precisa ter feito /cadastro) por CPF. Usado em telas que vinculam um
 * usuário existente a uma função na escola (ex.: Secretaria/Coordenação em
 * Gestão de Dados) antes de criar o vínculo via escolaxusuarioxfuncao.api.ts.
 * Lança erro (inclusive 404) se o CPF não existir — sempre trate com try/catch.
 */
export async function buscarUsuarioPorCPF(cpf: string): Promise<UsuarioBusca> {
  const response = await fetch(`${API_URL}/usuario/${cpf}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Usuário não encontrado');
  }
  return resultado.data.usuario;
}

export interface UsuarioAtualizado {
  UsuarioCPF: string;
  UsuarioEmail: string | null;
  UsuarioFotoUrl: string | null;
  UsuarioTema: 'light' | 'dark' | 'system';
  UsuarioModoDaltonico: boolean;
  UsuarioEscalaFonte: 'small' | 'medium' | 'large';
  UsuarioReduzirMovimento: boolean;
  UsuarioAltoContraste: boolean;
  UsuarioId: string | null;
  UsuarioTelefone: string | null;
  UsuarioNome: string;
  UsuarioStatus: 'Ativo' | 'Inativo' | 'Bloqueado';
}

/**
 * PUT /api/usuario/:UsuarioCPF — atualiza dado cadastral básico
 * (nome/e-mail/telefone) e/ou preferências de acessibilidade (tema, modo
 * daltônico, escala de fonte, redução de movimento, alto contraste — seção
 * "Preferências de acessibilidade" em Meu Perfil). Campos omitidos mantêm
 * o valor existente (PUT parcial).
 */
export async function atualizarUsuario(
  usuarioCPF: string,
  dados: {
    UsuarioNome?: string;
    UsuarioEmail?: string;
    UsuarioTelefone?: string;
    UsuarioTema?: 'light' | 'dark' | 'system';
    UsuarioModoDaltonico?: boolean;
    UsuarioEscalaFonte?: 'small' | 'medium' | 'large';
    UsuarioReduzirMovimento?: boolean;
    UsuarioAltoContraste?: boolean;
  }
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
