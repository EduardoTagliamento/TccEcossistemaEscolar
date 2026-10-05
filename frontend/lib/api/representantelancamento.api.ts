/**
 * API Client — Lançamento de Prova/Tarefa/Conteúdo por Representante
 * (temporário) — ver docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md.
 */
import { DiaSemana } from './escolaconfiguracao.api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token && token.trim() !== '') {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export interface AlocacaoRepresentante {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  TurmaGUID: string;
  TurmaNome: string;
  ProfessorNome: string;
}

export async function listarMinhasAlocacoes(escolaGUID: string): Promise<AlocacaoRepresentante[]> {
  const response = await fetch(`${API_URL}/representante/escolas/${escolaGUID}/minhas-alocacoes`, {
    headers: getHeaders(),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar suas turmas de representante');
  }
  return result.data.alocacoes;
}

export interface CriarProvaRepresentanteDTO {
  MateriaGUID: string;
  ProvaTitulo: string;
  ProvaData: string; // AAAA-MM-DDTHH:MM
  ProvaDescricao?: string;
  /** Capítulo(s) do livro didático — usado pro resumo de estudos por IA citar página real (opcional). */
  CapitulosGUIDs?: string[];
  /** Agendamento automático pelo cronograma (ver GradeHorariaAPI.calcularDatas) — ausente/false = data específica. */
  ModoAutomatico?: boolean;
  SemanaBase?: string;
  DiaSemana?: DiaSemana;
}

export async function criarProvaRepresentante(turmaGUID: string, dados: CriarProvaRepresentanteDTO): Promise<void> {
  const response = await fetch(`${API_URL}/representante/turmas/${turmaGUID}/provas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar a prova');
  }
}

export interface CriarTarefaRepresentanteDTO {
  MateriaGUID: string;
  TarefaTitulo: string;
  TarefaConteudo?: string;
  TarefaPrazoData: string; // AAAA-MM-DDTHH:MM
  TarefaTipoEntrega: 'digital' | 'fisica' | 'lista';
  /** Agendamento automático pelo cronograma (ver GradeHorariaAPI.calcularDatas) — ausente/false = dia definido. */
  ModoAutomatico?: boolean;
  SemanaBase?: string;
  DiaSemana?: DiaSemana;
}

export async function criarTarefaRepresentante(turmaGUID: string, dados: CriarTarefaRepresentanteDTO): Promise<void> {
  const response = await fetch(`${API_URL}/representante/turmas/${turmaGUID}/tarefas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar a tarefa');
  }
}

export interface CriarConteudoRepresentanteDTO {
  MateriaGUID: string;
  ConteudoTitulo: string;
  ConteudoDescricao?: string;
  ConteudoDataPublicacao: string; // AAAA-MM-DDTHH:MM
  ConteudoHtml: string;
}

export async function criarConteudoRepresentante(turmaGUID: string, dados: CriarConteudoRepresentanteDTO): Promise<void> {
  const response = await fetch(`${API_URL}/representante/turmas/${turmaGUID}/conteudos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.message || 'Erro ao criar o conteúdo');
  }
}
