/**
 * API Client para o Agendamento Automático (cálculo de datas a partir do
 * cronograma da turma), usado por Prova Agendada e Tarefa.
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

export interface EscolhaCalculo {
  TurmaGUID: string;
  /** Qualquer data (YYYY-MM-DD) dentro da semana desejada */
  SemanaBase: string;
  /** Obrigatório apenas quando a matéria tem mais de uma ocorrência semanal nesta turma */
  DiaSemana?: DiaSemana;
  DeslocamentoMinutos?: number;
}

export interface OcorrenciaCalculo {
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
}

export interface ResultadoCalculo {
  TurmaGUID: string;
  status: 'ok' | 'semCronograma' | 'escolherDia' | 'erro';
  DataCalculada?: string;
  DiaSemana?: DiaSemana;
  HoraBase?: string;
  Ocorrencias?: OcorrenciaCalculo[];
  mensagem?: string;
}

export async function calcularDatas(
  materiaGUID: string,
  escolhas: EscolhaCalculo[]
): Promise<ResultadoCalculo[]> {
  const response = await fetch(`${API_URL}/grade-horaria/calcular-datas`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ MateriaGUID: materiaGUID, Escolhas: escolhas }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao calcular datas automaticamente');
  }

  return result.data.resultados;
}
