/**
 * API Client para Aviso (comunicado de Direção/Coordenação/Secretaria).
 * Anexo é enviado antes, via `uploadAnexo` (anexo.api.ts) — aqui só se manda
 * o AnexoGUID já existente, mesmo padrão de `enviarEntregaDigital` no módulo
 * de Tarefa.
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

export type AvisoAbrangencia = 'Escola' | 'Turmas';

export interface Aviso {
  AvisoGUID: string;
  EscolaGUID: string;
  UsuarioCPFAutor: string;
  AvisoTitulo: string;
  AvisoConteudo: string;
  AvisoAbrangencia: AvisoAbrangencia;
  AvisoCreatedAt: string;
  Anexos: Anexo[];
  TurmaGUIDs: string[];
}

export interface CriarAvisoInput {
  EscolaGUID: string;
  AvisoTitulo: string;
  AvisoConteudo: string;
  AvisoAbrangencia: AvisoAbrangencia;
  TurmaGUIDs?: string[];
  AnexoGUIDs?: string[];
}

// CREATE
export async function criarAviso(input: CriarAvisoInput): Promise<Aviso> {
  const response = await fetch(`${API_URL}/aviso`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(input),
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao publicar aviso');
  }
  return resultado.data as Aviso;
}

// READ (lista — só Direção/Coordenação/Secretaria)
export async function listarAvisos(escolaGUID: string): Promise<Aviso[]> {
  const params = new URLSearchParams({ EscolaGUID: escolaGUID });
  const response = await fetch(`${API_URL}/aviso?${params}`, {
    headers: getHeaders(),
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao listar avisos');
  }
  return (resultado.data || []) as Aviso[];
}

// READ (por ID — marca como visualizado no backend)
export async function buscarAviso(guid: string): Promise<Aviso> {
  const response = await fetch(`${API_URL}/aviso/${guid}`, {
    headers: getHeaders(),
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao buscar aviso');
  }
  return resultado.data as Aviso;
}

// READ (aviso não visto mais recente — banner de destaque na home)
export async function buscarAvisoNaoVisualizado(escolaGUID: string): Promise<Aviso | null> {
  const params = new URLSearchParams({ EscolaGUID: escolaGUID });
  const response = await fetch(`${API_URL}/aviso/nao-visualizado?${params}`, {
    headers: getHeaders(),
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao buscar aviso pendente');
  }
  return (resultado.data as Aviso | null) ?? null;
}

// DELETE
export async function excluirAviso(guid: string): Promise<void> {
  const response = await fetch(`${API_URL}/aviso/${guid}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const resultado = await response.json();
  if (!response.ok || resultado?.success === false) {
    throw new Error(resultado?.message || 'Erro ao excluir aviso');
  }
}
