/**
 * Provas agendadas — espelha `frontend/lib/api/provaagendada.api.ts` (só
 * leitura no v1). Nota por aluno não é exposta aqui (fica no módulo de
 * banco de questões/respostas, fora do escopo desta leva).
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export interface TurmaResumo {
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
}

export type ProvaStatus = 'Agendada' | 'Realizada' | 'Cancelada';

export interface ProvaAgendada {
  ProvaAgendadaGUID: string;
  MateriaGUID: string;
  ProvaTitulo: string;
  ProvaData: string;
  ProvaDescricao: string | null;
  ProvaStatus: ProvaStatus;
  TurmasAtribuidasDetalhe: TurmaResumo[];
  DatasPorTurma: Record<string, string>;
}

export async function listarProvas(filtros?: {
  MateriaGUID?: string;
  ProvaStatus?: ProvaStatus;
  DataInicio?: string;
  DataFim?: string;
}): Promise<ProvaAgendada[]> {
  const response = await fetch(`${API_URL}/prova${query(filtros ?? {})}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ provas: ProvaAgendada[] }>(response, 'Erro ao listar provas');
  return resultado?.provas ?? [];
}

export async function buscarProva(provaAgendadaGUID: string): Promise<ProvaAgendada> {
  const response = await fetch(`${API_URL}/prova/${provaAgendadaGUID}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ prova: ProvaAgendada }>(response, 'Erro ao buscar prova');
  return resultado.prova;
}
