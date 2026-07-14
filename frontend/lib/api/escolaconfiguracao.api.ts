/**
 * API Client para Configurações da Escola
 * Parâmetros de horário letivo: minutos/aula, dias letivos, período
 * manhã/tarde e intervalos.
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

// ==================== TYPES ====================

export type DiaSemana =
  | 'Segunda'
  | 'Terca'
  | 'Quarta'
  | 'Quinta'
  | 'Sexta'
  | 'Sabado'
  | 'Domingo';

export const DIAS_SEMANA: DiaSemana[] = [
  'Segunda',
  'Terca',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sabado',
  'Domingo',
];

export const DIA_SEMANA_LABEL: Record<DiaSemana, string> = {
  Segunda: 'Segunda-feira',
  Terca: 'Terça-feira',
  Quarta: 'Quarta-feira',
  Quinta: 'Quinta-feira',
  Sexta: 'Sexta-feira',
  Sabado: 'Sábado',
  Domingo: 'Domingo',
};

export interface Intervalo {
  DiaSemana: DiaSemana | null;
  IntervaloInicio: string;
  IntervaloFim: string;
}

export interface EscolaConfiguracao {
  EscolaConfiguracaoGUID: string;
  EscolaGUID: string;
  MinutosPorAula: number;
  DiasSemana: DiaSemana[];
  PeriodoManhaInicio: string;
  PeriodoManhaFim: string;
  TemAulaTarde: boolean;
  PeriodoTardeInicio: string | null;
  PeriodoTardeFim: string | null;
  IntervaloVariado: boolean;
  Intervalos: Intervalo[];
  Configurada: boolean;
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface EscolaConfiguracaoSalvarDTO {
  MinutosPorAula: number;
  DiasSemana: DiaSemana[];
  PeriodoManhaInicio: string;
  PeriodoManhaFim: string;
  TemAulaTarde: boolean;
  PeriodoTardeInicio?: string | null;
  PeriodoTardeFim?: string | null;
  IntervaloVariado: boolean;
  Intervalos: Intervalo[];
}

// ==================== READ ====================

export async function obterConfiguracao(escolaGUID: string): Promise<EscolaConfiguracao> {
  const response = await fetch(`${API_URL}/escola-configuracao/${escolaGUID}`, {
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao obter configuração da escola');
  }

  return result.data.configuracao;
}

export interface SlotAula {
  HoraInicio: string;
  HoraFim: string;
}

export interface SlotsPorDia {
  DiaSemana: DiaSemana;
  Manha: SlotAula[];
  Tarde: SlotAula[];
}

export async function obterSlots(escolaGUID: string): Promise<SlotsPorDia[]> {
  const response = await fetch(`${API_URL}/escola-configuracao/${escolaGUID}/slots`, {
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao obter slots de aula da escola');
  }

  return result.data.slots;
}

// ==================== UPDATE (upsert) ====================

export async function salvarConfiguracao(
  escolaGUID: string,
  dados: EscolaConfiguracaoSalvarDTO
): Promise<{ configuracao: EscolaConfiguracao; avisos: string[] }> {
  const response = await fetch(`${API_URL}/escola-configuracao/${escolaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ configuracao: dados }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao salvar configuração da escola');
  }

  return {
    configuracao: result.data.configuracao,
    avisos: result.data.avisos || [],
  };
}
