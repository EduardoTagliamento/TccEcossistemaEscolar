/**
 * Avisos de calendário agregados (tarefa/prova por período) — espelha
 * `frontend/lib/api/calendario.api.ts`.
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export interface AvisoCalendario {
  TipoAviso: 'tarefa' | 'prova';
  AvisoId: string;
  MatriculaGUID?: string | null;
  DataPrazo: string;
  Titulo: string;
  Descricao: string | null;
  StatusTexto: string;
  TipoEntrega: 'digital' | 'fisica' | null;
  IsFeito?: boolean;
}

export async function listarCalendario(filtros: {
  EscolaGUID: string;
  DataInicio: string;
  DataFim: string;
  TipoAviso?: 'tarefa' | 'prova';
}): Promise<AvisoCalendario[]> {
  const response = await fetch(`${API_URL}/calendario${query(filtros)}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ avisos: AvisoCalendario[] }>(response, 'Erro ao carregar calendário');
  return resultado?.avisos ?? [];
}
