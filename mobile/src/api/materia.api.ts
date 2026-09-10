/**
 * Matérias/disciplinas — espelha `frontend/lib/api/materia.api.ts` (só
 * leitura, usada nas telas de Início/Matérias do v1).
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export interface Materia {
  MateriaGUID: string;
  EscolaGUID: string;
  CursoGUID: string | null;
  MateriaGlobalGUID: string | null;
  MateriaNome: string;
  MateriaIsTecnica: boolean;
  MateriaStatus: 'Ativa' | 'Inativa';
}

export async function listarMaterias(filtros?: {
  EscolaGUID?: string;
  MateriaStatus?: 'Ativa' | 'Inativa';
}): Promise<Materia[]> {
  const response = await fetch(`${API_URL}/materia${query(filtros ?? {})}`, {
    headers: getHeaders(),
  });
  const resultado = await tratarResposta<{ materias: Materia[] }>(response, 'Erro ao listar matérias');
  return resultado.materias ?? [];
}

export async function buscarMateria(materiaGUID: string): Promise<Materia> {
  const response = await fetch(`${API_URL}/materia/${materiaGUID}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ materia: Materia }>(response, 'Erro ao buscar matéria');
  return resultado.materia;
}
