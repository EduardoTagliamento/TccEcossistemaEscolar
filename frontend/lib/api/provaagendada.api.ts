/**
 * API Client para ProvaAgendada.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export interface TurmaResumo {
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
}

export interface ProvaAgendada {
  ProvaAgendadaGUID: string;
  MateriaGUID: string;
  ProvaData: string;
  ProvaDescricao: string | null;
  ProvaStatus: 'Agendada' | 'Realizada' | 'Cancelada';
  TurmasAtribuidas: string[];
  TurmasAtribuidasDetalhe: TurmaResumo[];
  DatasPorTurma: Record<string, string>;
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface CriarProvaDados {
  TurmasGUID: string[];
  MateriaGUID: string;
  ProvaData: string;
  ProvaDescricao?: string;
  anexosDescricao?: string[];
  DatasPorTurma?: Record<string, string>;
  CategoriasPorTurma?: Record<string, string>;
}

export interface AtualizarProvaDados {
  ProvaData?: string;
  ProvaDescricao?: string;
  ProvaStatus?: 'Agendada' | 'Realizada' | 'Cancelada';
}

export async function criarProva(dados: CriarProvaDados): Promise<ProvaAgendada> {
  const response = await fetch(`${API_URL}/prova`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prova: dados }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar prova');
  }
  return result.data.prova;
}

export async function listarProvas(filtros?: {
  MateriaGUID?: string;
  ProvaStatus?: 'Agendada' | 'Realizada' | 'Cancelada';
  DataInicio?: string;
  DataFim?: string;
}): Promise<ProvaAgendada[]> {
  const params = new URLSearchParams();
  if (filtros?.MateriaGUID) params.append('MateriaGUID', filtros.MateriaGUID);
  if (filtros?.ProvaStatus) params.append('ProvaStatus', filtros.ProvaStatus);
  if (filtros?.DataInicio) params.append('DataInicio', filtros.DataInicio);
  if (filtros?.DataFim) params.append('DataFim', filtros.DataFim);

  const response = await fetch(`${API_URL}/prova?${params}`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar provas');
  }
  return result.data?.provas || [];
}

export async function buscarProva(provaAgendadaGUID: string): Promise<ProvaAgendada> {
  const response = await fetch(`${API_URL}/prova/${provaAgendadaGUID}`, {
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar prova');
  }
  return result.data.prova;
}

export async function atualizarProva(provaAgendadaGUID: string, dados: AtualizarProvaDados): Promise<ProvaAgendada> {
  const response = await fetch(`${API_URL}/prova/${provaAgendadaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ prova: dados }),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao atualizar prova');
  }
  return result.data.prova;
}

export async function excluirProva(provaAgendadaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/prova/${provaAgendadaGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao excluir prova');
  }
}

/** "Excluir só desta turma" — se for a última turma restante, cai pra exclusão completa. */
export async function removerProvaDeTurma(provaAgendadaGUID: string, turmaGUID: string): Promise<{ provaExcluidaPorCompleto: boolean }> {
  const response = await fetch(`${API_URL}/prova/${provaAgendadaGUID}/turma/${turmaGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao remover prova desta turma');
  }
  return result.data;
}

export interface RecomendacaoVideo {
  titulo: string;
  url: string;
  canal: string;
  thumbnailUrl: string | null;
}

export interface RecomendacaoFonte {
  tipo: 'Conteudo' | 'MaterialDidatico';
  guid: string;
  rotulo: string;
}

export interface RecomendacaoPaginaLivro {
  materialDidaticoGUID: string;
  materialDidaticoTitulo: string;
  capituloGUID: string;
  capituloTitulo: string;
  paginaInicio: number;
  paginaFim: number;
}

export interface RecomendacaoEstudo {
  ProvaAgendadaGUID: string;
  Videos: RecomendacaoVideo[];
  Resumo: string | null;
  FontesUsadas: RecomendacaoFonte[];
  PaginaLivro: RecomendacaoPaginaLivro | null;
  SubMateriaGlobalGUID: string | null;
  StatusGeracao: 'Pendente' | 'Concluida' | 'Falhou';
  GeradoEm: string | null;
}

/**
 * A recomendação é gerada de forma assíncrona (fire-and-forget) na criação/
 * edição da prova — 404 é um estado normal logo depois de criar (ainda não
 * chegou a existir a linha de cache), por isso devolve `null` em vez de
 * lançar erro.
 */
export async function buscarRecomendacaoProva(provaAgendadaGUID: string): Promise<RecomendacaoEstudo | null> {
  const response = await fetch(`${API_URL}/prova/${provaAgendadaGUID}/recomendacao`, {
    headers: getHeaders(),
  });

  if (response.status === 404) {
    return null;
  }

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar recomendação de estudo');
  }
  return result.data.recomendacao;
}

export async function registrarVisualizacaoProva(provaAgendadaTurmaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/prova/turma/${provaAgendadaTurmaGUID}/visualizar`, {
    method: 'POST',
    headers: getHeaders(),
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao registrar visualização da prova');
  }
}
