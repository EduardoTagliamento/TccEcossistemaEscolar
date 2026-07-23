/**
 * API Client para Conteúdo (materiais de aula: vídeo/áudio, texto ou
 * arquivo paginado).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getAuthHeader(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type ConteudoTipo = 'cronometrado' | 'texto' | 'paginado';
export type ConteudoOrigemTipo = 'upload' | 'link';

export interface ConteudoTurmaInfo {
  TurmaGUID: string;
  ConteudoDataPublicacao: string;
}

export interface Conteudo {
  ConteudoGUID: string;
  MateriaGUID: string;
  UsuarioCPF: string;
  CategoriaGUID: string | null;
  ConteudoTitulo: string;
  ConteudoTipo: ConteudoTipo;
  ConteudoDescricao: string | null;
  ConteudoDataPublicacao: string;
  Turmas: ConteudoTurmaInfo[];
  Cronometrado?: {
    OrigemTipo: ConteudoOrigemTipo;
    ArquivoUrl: string | null;
    LinkUrl: string | null;
    DuracaoSegundos: number | null;
    ArquivoMimeType: string | null;
  };
  Texto?: { ConteudoHtml: string };
  Paginado?: { Arquivos: { ConteudoPaginadoArquivoGUID: string; Ordem: number; ArquivoUrl: string; ArquivoMimeType: string }[] };
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface CriarConteudoParams {
  MateriaGUID: string;
  ConteudoTitulo: string;
  ConteudoTipo: ConteudoTipo;
  ConteudoDescricao?: string;
  TurmasGUID: string[];
  /** String de data já no formato esperado pelo backend (GMT-3 "ingênuo", mesma convenção de Prova/Tarefa) */
  ConteudoDataPublicacao: string;
  DatasPorTurma?: Record<string, string>;
  /** Categoria por turma (chave = TurmaGUID) — categoria agora é escopada por turma, não só por matéria. */
  CategoriasPorTurma?: Record<string, string>;

  // tipo "cronometrado"
  OrigemTipo?: ConteudoOrigemTipo;
  LinkUrl?: string;
  arquivoCronometrado?: File;

  // tipo "texto"
  ConteudoHtml?: string;

  // tipo "paginado"
  arquivosPaginado?: File[];
}

export async function criarConteudo(params: CriarConteudoParams): Promise<Conteudo> {
  const formData = new FormData();
  formData.append('MateriaGUID', params.MateriaGUID);
  formData.append('ConteudoTitulo', params.ConteudoTitulo);
  formData.append('ConteudoTipo', params.ConteudoTipo);
  if (params.ConteudoDescricao) formData.append('ConteudoDescricao', params.ConteudoDescricao);
  formData.append('TurmasGUID', JSON.stringify(params.TurmasGUID));
  formData.append('ConteudoDataPublicacao', params.ConteudoDataPublicacao);
  if (params.DatasPorTurma) {
    formData.append('DatasPorTurma', JSON.stringify(params.DatasPorTurma));
  }
  if (params.CategoriasPorTurma) {
    formData.append('CategoriasPorTurma', JSON.stringify(params.CategoriasPorTurma));
  }

  if (params.ConteudoTipo === 'cronometrado') {
    if (params.OrigemTipo) formData.append('OrigemTipo', params.OrigemTipo);
    if (params.OrigemTipo === 'upload' && params.arquivoCronometrado) {
      formData.append('arquivo', params.arquivoCronometrado);
    } else if (params.OrigemTipo === 'link' && params.LinkUrl) {
      formData.append('LinkUrl', params.LinkUrl);
    }
  } else if (params.ConteudoTipo === 'texto') {
    formData.append('ConteudoHtml', params.ConteudoHtml || '');
  } else if (params.ConteudoTipo === 'paginado') {
    (params.arquivosPaginado || []).forEach((arquivo) => formData.append('arquivos', arquivo));
  }

  const response = await fetch(`${API_URL}/conteudo`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: formData,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar conteúdo');
  }
  return result.data.conteudo;
}

export async function listarConteudos(filters?: {
  MateriaGUID?: string;
  UsuarioCPF?: string;
  CategoriaGUID?: string;
  ConteudoTipo?: ConteudoTipo;
}): Promise<Conteudo[]> {
  const params = new URLSearchParams();
  if (filters?.MateriaGUID) params.append('MateriaGUID', filters.MateriaGUID);
  if (filters?.UsuarioCPF) params.append('UsuarioCPF', filters.UsuarioCPF);
  if (filters?.CategoriaGUID) params.append('CategoriaGUID', filters.CategoriaGUID);
  if (filters?.ConteudoTipo) params.append('ConteudoTipo', filters.ConteudoTipo);

  const response = await fetch(`${API_URL}/conteudo?${params}`, {
    headers: getAuthHeader(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar conteúdos');
  }
  return result.data?.conteudos || [];
}

export async function buscarConteudo(conteudoGUID: string): Promise<Conteudo> {
  const response = await fetch(`${API_URL}/conteudo/${conteudoGUID}`, {
    headers: getAuthHeader(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar conteúdo');
  }
  return result.data.conteudo;
}

export async function excluirConteudo(conteudoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/conteudo/${conteudoGUID}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir conteúdo');
  }
}
