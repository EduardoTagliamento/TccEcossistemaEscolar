/**
 * API Client para o Cronograma (grade horária) da Turma
 */
import { DiaSemana } from './escolaconfiguracao.api';

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

// ==================== TYPES ====================

export interface HorarioTurma {
  HorarioTurmaGUID: string;
  TurmaGUID: string;
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  UsuarioCPF: string;
  UsuarioNome: string;
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
}

export interface BancoItem {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  UsuarioCPF: string;
  UsuarioNome: string;
  AulasPorSemana: number | null;
  AulasAlocadas: number;
  AulasRestantes: number | null;
}

export interface CronogramaTurma {
  TurmaGUID: string;
  Slots: HorarioTurma[];
  Banco: BancoItem[];
}

export interface AlocarSlotDTO {
  MatProfTurGUID: string;
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
}

class ApiError extends Error {
  details?: Record<string, unknown>;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message);
    this.details = details;
  }
}

// ==================== READ ====================

export async function obterCronograma(turmaGUID: string): Promise<CronogramaTurma> {
  const response = await fetch(`${API_URL}/turma/${turmaGUID}/cronograma`, {
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new ApiError(result.message || 'Erro ao obter cronograma da turma', result.details);
  }

  return result.data.cronograma;
}

// ==================== CREATE (alocar) ====================

export async function alocarSlot(turmaGUID: string, slot: AlocarSlotDTO): Promise<HorarioTurma> {
  const response = await fetch(`${API_URL}/turma/${turmaGUID}/cronograma/slot`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ slot }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new ApiError(result.message || 'Erro ao alocar matéria no cronograma', result.details);
  }

  return result.data.slot;
}

// ==================== DELETE (remover / voltar para o banco) ====================

export async function removerSlot(turmaGUID: string, horarioTurmaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/turma/${turmaGUID}/cronograma/slot/${horarioTurmaGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const result = await response.json();
    throw new ApiError(result.message || 'Erro ao remover matéria do horário', result.details);
  }
}
