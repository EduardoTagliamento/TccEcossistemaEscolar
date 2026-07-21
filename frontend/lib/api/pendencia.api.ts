/**
 * API Client para Pendência (lembretes/avisos direcionados a um único
 * destinatário — ver `docs/routes/pendencia-api.md`). Padrão de
 * fetch/headers/erro seguindo `frontend/lib/api/evento.api.ts`.
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

export interface Pendencia {
  PendenciaGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  PendenciaTitulo: string;
  PendenciaConteudo: string | null;
  PendenciaPostagemData: string;
  PendenciaPrazoData: string;
  PendenciaFeito: boolean;
  PendenciaRealizacaoData: string | null;
}

export interface PendenciaCreateDTO {
  UsuarioCPFDestino: string;
  EscolaGUID: string;
  PendenciaTitulo: string;
  PendenciaConteudo?: string;
  PendenciaPrazoData: string;
}

export interface PendenciaUpdateDTO {
  PendenciaTitulo?: string;
  PendenciaConteudo?: string | null;
  PendenciaPrazoData?: string;
}

export interface PendenciaAnexo {
  AnexoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnexoCaminho: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: string | null;
}

/** GET /api/pendencia — sem EscolaGUID (ou sem ser admin da escola), a API já restringe às pendências do próprio usuário. */
export async function listarPendencias(filtro?: {
  EscolaGUID?: string;
  PendenciaFeito?: boolean;
  atrasadas?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ pendencias: Pendencia[]; total: number }> {
  const query = new URLSearchParams();
  if (filtro?.EscolaGUID) query.set('EscolaGUID', filtro.EscolaGUID);
  if (filtro?.PendenciaFeito !== undefined) query.set('PendenciaFeito', String(filtro.PendenciaFeito));
  if (filtro?.atrasadas !== undefined) query.set('atrasadas', String(filtro.atrasadas));
  if (filtro?.limit) query.set('limit', String(filtro.limit));
  if (filtro?.offset) query.set('offset', String(filtro.offset));

  const response = await fetch(`${API_URL}/pendencia?${query.toString()}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar pendências');
  }
  return resultado.data as { pendencias: Pendencia[]; total: number };
}

/** GET /api/pendencia/:PendenciaGUID — acesso permitido ao destinatário ou a admin da escola. */
export async function buscarPendencia(pendenciaGUID: string): Promise<Pendencia> {
  const response = await fetch(`${API_URL}/pendencia/${pendenciaGUID}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao buscar pendência');
  }
  return resultado.data.pendencia as Pendencia;
}

/** POST /api/pendencia — restrito a Coordenação/Secretaria/Direção (403 do backend caso contrário). */
export async function criarPendencia(data: PendenciaCreateDTO): Promise<Pendencia> {
  const response = await fetch(`${API_URL}/pendencia`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao criar pendência');
  }
  return resultado.data.pendencia as Pendencia;
}

/** PUT /api/pendencia/:PendenciaGUID — restrito a Coordenação/Secretaria/Direção; não permite trocar o destinatário. */
export async function atualizarPendencia(pendenciaGUID: string, data: PendenciaUpdateDTO): Promise<Pendencia> {
  const response = await fetch(`${API_URL}/pendencia/${pendenciaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao atualizar pendência');
  }
  return resultado.data.pendencia as Pendencia;
}

/** DELETE /api/pendencia/:PendenciaGUID — hard delete, restrito a Coordenação/Secretaria/Direção. */
export async function excluirPendencia(pendenciaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/pendencia/${pendenciaGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao excluir pendência');
  }
}

/** PATCH /api/pendencia/:PendenciaGUID/feito — apenas o próprio destinatário pode chamar. */
export async function marcarComoFeito(pendenciaGUID: string): Promise<Pendencia> {
  const response = await fetch(`${API_URL}/pendencia/${pendenciaGUID}/feito`, {
    method: 'PATCH',
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao marcar pendência como feita');
  }
  return resultado.data.pendencia as Pendencia;
}

/**
 * GET /api/pendencia/contador/pendentes — total de pendências não concluídas
 * do usuário autenticado. Usado pelo badge dinâmico "Minhas Pendências" da navbar.
 */
export async function contarPendencias(escolaGUID?: string): Promise<number> {
  const query = new URLSearchParams();
  if (escolaGUID) query.set('EscolaGUID', escolaGUID);

  const response = await fetch(`${API_URL}/pendencia/contador/pendentes?${query.toString()}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao contar pendências');
  }
  return (resultado.data?.total as number) ?? 0;
}

/** GET /api/pendencia/:PendenciaGUID/anexos */
export async function listarAnexosPendencia(pendenciaGUID: string): Promise<PendenciaAnexo[]> {
  const response = await fetch(`${API_URL}/pendencia/${pendenciaGUID}/anexos`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar anexos da pendência');
  }
  return (resultado.data?.anexos || []) as PendenciaAnexo[];
}

/**
 * POST /api/pendencia/:PendenciaGUID/anexos — vincula um anexo já enviado
 * via `/api/anexo`. Apenas o destinatário pode chamar (fix de segurança
 * aplicado no backend).
 */
export async function vincularAnexoPendencia(pendenciaGUID: string, anexoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/pendencia/${pendenciaGUID}/anexos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ AnexoGUID: anexoGUID }),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao vincular anexo à pendência');
  }
}
