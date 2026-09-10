/**
 * Tarefas acadêmicas — espelha `frontend/lib/api/tarefaacademica.api.ts` e
 * `frontend/types/tarefaacademica.ts` (só leitura no v1). Como aluno, a API
 * já restringe `MatriculasAtribuidas` à própria matrícula.
 */
import { API_URL, getHeaders, query, tratarResposta } from './client';

export interface AnexoTarefaResumo {
  AnexoGUID: string;
  AnexoNomeOriginal: string | null;
  AnexoCaminho: string;
}

export interface MatriculaAtribuida {
  TarefaMatriculaGUID: string;
  MatriculaGUID: string;
  AlunoNome: string | null;
  TarefaPrazoData: string;
  TarefaFeito: boolean;
  TarefaRealizacaoData: string | null;
  TarefaNota: number | null;
  TarefaAvaliadoEm: string | null;
}

export interface TarefaAcademica {
  TarefaGUID: string;
  matXprofXturxescGUID: string;
  MateriaGUID?: string;
  MateriaNome?: string;
  ProfessorNome?: string;
  TurmaGUID?: string;
  TurmaNome?: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPostagemData: string;
  TarefaPrazoData: string;
  TarefaTipoEntrega: 'digital' | 'fisica' | 'lista';
  TarefaCompartilhada: boolean;
  AnexosDescricao: AnexoTarefaResumo[];
  MatriculasAtribuidas?: MatriculaAtribuida[];
}

/** Status computado pelo backend — mesmas 4 faixas usadas nos badges/trilhos de cor da tela. */
export type TarefaStatus = 'Atrasada' | 'Pendente' | 'Rascunho' | 'Concluida';

export interface TarefaListItem extends TarefaAcademica {
  Status?: TarefaStatus;
}

export async function listarTarefas(filtros?: {
  EscolaGUID?: string;
  matXprofXturxescGUID?: string;
  DataInicio?: string;
  DataFim?: string;
}): Promise<TarefaListItem[]> {
  const response = await fetch(`${API_URL}/tarefa${query(filtros ?? {})}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ tarefas: TarefaListItem[] }>(response, 'Erro ao listar tarefas');
  return resultado?.tarefas ?? [];
}

export async function buscarTarefa(tarefaGUID: string): Promise<TarefaAcademica> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}`, { headers: getHeaders() });
  const resultado = await tratarResposta<{ tarefa: TarefaAcademica }>(response, 'Erro ao buscar tarefa');
  return resultado.tarefa;
}
