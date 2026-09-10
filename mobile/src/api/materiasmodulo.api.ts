/**
 * Matérias "com capa" (imagem/cor personalizadas) — espelha o trecho de
 * grids de navegação de `frontend/lib/api/materiasmodulo.api.ts`. Diferente
 * de `materia.api.ts` (CRUD genérico, sem imagem): estes são os endpoints
 * reais que a Home/grade do aluno e do professor usam, incluindo a
 * `ImagemUrl`/`CorFundo` que a tela de Matérias do app precisa mostrar.
 */
import { API_URL, getHeaders, tratarResposta } from './client';

export interface MateriaDoAluno {
  MateriaGUID: string;
  MateriaNome: string;
  TurmaGUID: string;
  ProfessorGUID: string;
  ProfessorCPF: string;
  ProfessorNome: string;
  ProfessorFotoUrl: string | null;
  ImagemUrl: string | null;
  CorFundo: string;
  MensagemBoasVindas: string | null;
}

export async function listarMateriasDoAluno(usuarioGUID: string, escolaGUID: string): Promise<MateriaDoAluno[]> {
  const response = await fetch(`${API_URL}/materia/aluno/${usuarioGUID}?EscolaGUID=${escolaGUID}`, {
    headers: getHeaders(),
  });
  const resultado = await tratarResposta<{ materias: MateriaDoAluno[] }>(response, 'Erro ao listar matérias');
  return resultado?.materias ?? [];
}

export interface MateriaComCapa {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  ImagemUrl: string | null;
  CorFundo: string;
}

export async function listarMateriasComCapaProfessor(escolaGUID: string): Promise<MateriaComCapa[]> {
  const response = await fetch(`${API_URL}/professor/materias-com-capa?EscolaGUID=${escolaGUID}`, {
    headers: getHeaders(),
  });
  return tratarResposta<MateriaComCapa[]>(response, 'Erro ao listar matérias');
}
