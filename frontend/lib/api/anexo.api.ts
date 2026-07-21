/**
 * API Client para Anexo (arquivo genérico).
 * Upload é multipart/form-data (mesmo padrão de `frontend/lib/api/upload.api.ts`
 * — FormData + fetch, sem Content-Type manual, o browser define o boundary
 * do multipart sozinho). As demais operações usam JSON, mesmo padrão de
 * `frontend/lib/api/pendencia.api.ts`.
 *
 * Limites reais confirmados em `backend/middlewares/anexo-upload.middleware.ts`
 * (não confiar em `docs/routes/anexo-api.md`, que está desatualizado):
 * - Tamanho máximo: 50MB
 * - Tipos permitidos: PDF, JPEG/JPG, PNG, GIF, WEBP, DOC, DOCX, XLS, XLSX, TXT, ZIP
 *   (NÃO inclui PPT/PPTX)
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const ANEXO_TAMANHO_MAXIMO_BYTES = 50 * 1024 * 1024; // 50MB

export const ANEXO_MIME_TYPES_PERMITIDOS = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
];

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

export interface Anexo {
  AnexoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnexoCaminho: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: string | null;
}

/**
 * POST /api/anexo — upload de arquivo (multipart/form-data).
 * Campos do form (ver `routes/anexo.routes.ts` + `backend/middlewares/anexo.middleware.ts`):
 * - `file`: o arquivo em si (multer `.single("file")`)
 * - `EscolaGUID`: obrigatório, UUID v4
 */
export async function uploadAnexo(arquivo: File, escolaGUID: string): Promise<Anexo> {
  const formData = new FormData();
  formData.append('file', arquivo);
  formData.append('EscolaGUID', escolaGUID);

  const response = await fetch(`${API_URL}/anexo`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
    body: formData,
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao enviar anexo');
  }
  return resultado.data.anexo as Anexo;
}

/** GET /api/anexo — listar anexos com filtros opcionais. */
export async function listarAnexos(filtro?: {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  DataInicio?: string;
  DataFim?: string;
}): Promise<Anexo[]> {
  const query = new URLSearchParams();
  if (filtro?.UsuarioCPF) query.set('UsuarioCPF', filtro.UsuarioCPF);
  if (filtro?.EscolaGUID) query.set('EscolaGUID', filtro.EscolaGUID);
  if (filtro?.DataInicio) query.set('DataInicio', filtro.DataInicio);
  if (filtro?.DataFim) query.set('DataFim', filtro.DataFim);

  const response = await fetch(`${API_URL}/anexo?${query.toString()}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar anexos');
  }
  return (resultado.data?.anexos || []) as Anexo[];
}

/** GET /api/anexo/:AnexoGUID — buscar metadados de um anexo. */
export async function buscarAnexo(anexoGUID: string): Promise<Anexo> {
  const response = await fetch(`${API_URL}/anexo/${anexoGUID}`, {
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao buscar anexo');
  }
  return resultado.data.anexo as Anexo;
}

/** DELETE /api/anexo/:AnexoGUID — excluir anexo (banco + arquivo físico). */
export async function excluirAnexo(anexoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/anexo/${anexoGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao excluir anexo');
  }
}
