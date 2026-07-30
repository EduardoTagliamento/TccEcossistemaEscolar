import {
  TarefaAcademica,
  TarefaFormData,
  TarefaCreateResponse,
  TarefaListItem,
  Questao,
  QuestaoCreateInput,
  QuestaoUpdateInput,
  QuestaoComRespostaProfessor,
  RespostaQuestao,
  QuestaoImportRow,
  ImportacaoResultado,
} from '@/types/tarefaacademica';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Helper: obter token do localStorage
function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

// Helper: headers padrão
function getHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
  };
}

// CREATE - Criar tarefa (individual ou compartilhada)
export async function criarTarefa(data: TarefaFormData): Promise<TarefaCreateResponse> {
  const response = await fetch(`${API_URL}/tarefa`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao criar tarefa');
  }

  return result;
}

// READ - Buscar tarefa por GUID
export async function buscarTarefa(tarefaGUID: string): Promise<TarefaAcademica> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao buscar tarefa');
  }

  return result.data.tarefa;
}

// READ - Listar tarefas
export async function listarTarefas(filters?: {
  matXprofXturxescGUID?: string;
  DataInicio?: string;
  DataFim?: string;
  TarefaCompartilhada?: boolean;
}): Promise<TarefaListItem[]> {
  const params = new URLSearchParams();
  
  if (filters?.matXprofXturxescGUID) {
    params.append('matXprofXturxescGUID', filters.matXprofXturxescGUID);
  }
  
  if (filters?.DataInicio) {
    params.append('DataInicio', filters.DataInicio);
  }
  
  if (filters?.DataFim) {
    params.append('DataFim', filters.DataFim);
  }
  
  if (filters?.TarefaCompartilhada !== undefined) {
    params.append('TarefaCompartilhada', String(filters.TarefaCompartilhada));
  }

  const response = await fetch(`${API_URL}/tarefa?${params}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao listar tarefas');
  }

  return result.data?.tarefas || [];
}

// READ - Buscar tarefa por GUID com o detalhe usado no visualizador de item (matrículas
// atribuídas, entregas etc.). Para não-professor, `minhaMatricula=true` restringe a
// resposta à atribuição do próprio aluno.
export async function buscarTarefaItemDetalhe(tarefaGUID: string, ehProfessor: boolean): Promise<any> {
  const query = ehProfessor ? '' : '?minhaMatricula=true';
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}${query}`, {
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao buscar tarefa');
  }

  return result.data.tarefa;
}

// UPDATE - Atualizar tarefa
export async function atualizarTarefa(
  tarefaGUID: string,
  updates: Partial<Pick<TarefaAcademica, 
    'TarefaTitulo' | 'TarefaConteudo' | 'TarefaPrazoData' | 'TarefaTipoEntrega' |
    'TarefaMinPessoas' | 'TarefaMaxPessoas'
  >>
): Promise<TarefaAcademica> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao atualizar tarefa');
  }

  return result.data;
}

// DELETE - Deletar tarefa
export async function deletarTarefa(tarefaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}`, {
    method: 'DELETE',
    headers: getHeaders()
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao deletar tarefa');
  }
}

// Vincular anexo (já enviado via POST /api/anexo) como entrega digital do aluno
export async function enviarAnexoEntrega(tarefaGUID: string, anexoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}/anexo-entrega`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ AnexoGUID: anexoGUID }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao enviar anexo de entrega');
  }
}

// Marcar tarefa como feita/desfeita para a matrícula do aluno autenticado
export async function marcarComoFeito(tarefaGUID: string, matriculaGUID: string, tarefaFeito: boolean): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}/marcar-feito`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ MatriculaGUID: matriculaGUID, TarefaFeito: tarefaFeito }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao marcar tarefa');
  }
}

// ========== Questão de tarefa "lista" (quiz estilo Forms) ==========

export async function criarQuestao(tarefaGUID: string, questao: QuestaoCreateInput): Promise<Questao> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}/questoes`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ questao }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao criar questão');
  }

  return result.data.questao;
}

export async function criarQuestoesBatch(tarefaGUID: string, questoes: QuestaoCreateInput[]): Promise<{ criadas: Questao[]; count: number }> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}/questoes/batch`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ questoes }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao criar questões');
  }

  return result.data;
}

export async function listarQuestoes(tarefaGUID: string): Promise<Questao[]> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}/questoes`, {
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao listar questões');
  }

  return result.data?.questoes || [];
}

export async function atualizarQuestao(questaoGUID: string, questao: QuestaoUpdateInput): Promise<Questao> {
  const response = await fetch(`${API_URL}/tarefa/questoes/${questaoGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ questao }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao atualizar questão');
  }

  return result.data.questao;
}

export async function excluirQuestao(questaoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/questoes/${questaoGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao excluir questão');
  }
}

export async function reordenarQuestoes(tarefaGUID: string, ordens: Array<{ QuestaoGUID: string; QuestaoOrdem: number }>): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}/questoes/reordenar`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ ordens }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao reordenar questões');
  }
}

export async function vincularAnexoQuestao(questaoGUID: string, anexoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/questoes/${questaoGUID}/anexos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ AnexoGUID: anexoGUID }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao vincular anexo à questão');
  }
}

export async function desvincularAnexoQuestao(questaoGUID: string, anexoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/tarefa/questoes/${questaoGUID}/anexos/${anexoGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao desvincular anexo da questão');
  }
}

export async function importarQuestoesPlanilha(tarefaGUID: string, linhas: QuestaoImportRow[]): Promise<ImportacaoResultado> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}/questoes/importar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ linhas }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao importar questões');
  }

  return result.data;
}

// ========== Correção do professor (tarefa "lista") ==========

export async function buscarRespostasAluno(tarefaGUID: string, tarefaMatriculaGUID: string): Promise<QuestaoComRespostaProfessor[]> {
  const response = await fetch(`${API_URL}/tarefa/${tarefaGUID}/questoes/matricula/${tarefaMatriculaGUID}`, {
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao buscar respostas do aluno');
  }

  return result.data?.questoes || [];
}

export async function avaliarQuestaoDiscursiva(respostaGUID: string, pontos: number): Promise<RespostaQuestao> {
  const response = await fetch(`${API_URL}/tarefa/respostas/${respostaGUID}/avaliar`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ Pontos: pontos }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || result.message || 'Erro ao corrigir resposta');
  }

  return result.data.resposta;
}
