/**
 * API Client para Sugestão — módulo temporário (beta com grupo pequeno).
 * Ver backend/database/migrations/2026-08-09-sugestao.sql e
 * 2026-08-10-sugestao-anexo.sql. Anexo é enviado antes, via `uploadAnexo`
 * (anexo.api.ts) — aqui só se manda o AnexoGUID já existente, mesmo padrão
 * de aviso.api.ts.
 */
import { Anexo } from './anexo.api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getToken()}`,
  };
}

export interface Sugestao {
  SugestaoGUID: string;
  UsuarioGUID: string;
  EscolaGUID: string | null;
  SugestaoTexto: string;
  SugestaoPaginaUrl: string | null;
  SugestaoCreatedAt: string;
  UsuarioNome: string | null;
  UsuarioEmail: string | null;
  Anexos: Anexo[];
}

// CREATE — qualquer usuário autenticado
export async function criarSugestao(
  texto: string,
  escolaGUID?: string,
  paginaUrl?: string,
  anexoGUIDs?: string[]
): Promise<void> {
  const response = await fetch(`${API_URL}/sugestao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      SugestaoTexto: texto,
      EscolaGUID: escolaGUID,
      SugestaoPaginaUrl: paginaUrl,
      AnexoGUIDs: anexoGUIDs,
    }),
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao enviar sugestão');
  }
}

// READ — só admin de plataforma
export async function listarSugestoes(): Promise<Sugestao[]> {
  const response = await fetch(`${API_URL}/sugestao`, {
    headers: getHeaders(),
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar sugestões');
  }
  return (resultado.data || []) as Sugestao[];
}

// DELETE — só admin de plataforma
export async function excluirSugestao(guid: string): Promise<void> {
  const response = await fetch(`${API_URL}/sugestao/${guid}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao excluir sugestão');
  }
}
