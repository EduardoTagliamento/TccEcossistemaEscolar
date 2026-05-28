/**
 * Tipos TypeScript para o sistema de Tarefas Acadêmicas Compartilhadas
 */

export interface TarefaAcademica {
  TarefaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPostagemData: string; // ISO string
  TarefaPrazoData: string; // ISO string
  TarefaTipoEntrega: 'digital' | 'fisica';
  TarefaCompartilhada: boolean;
  TarefaMinPessoas: number | null;
  TarefaMaxPessoas: number | null;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface TarefaFormData {
  TarefaTitulo: string;
  TarefaConteudo: string;
  TarefaPostagemData: string;
  TarefaPrazoData: string;
  TarefaTipoEntrega: 'digital' | 'fisica';
  TarefaCompartilhada: boolean;
  TarefaMinPessoas: number | null;
  TarefaMaxPessoas: number | null;
  matXprofXturxescGUID: string;
}

export interface TarefaCreateResponse {
  success: boolean;
  data: {
    tarefa: TarefaAcademica;
    gruposCriados?: number;
  };
}

export interface TarefaListItem extends TarefaAcademica {
  MateriaNome?: string;
  ProfessorNome?: string;
  TurmaNome?: string;
  Status?: 'Atrasada' | 'Pendente' | 'Rascunho' | 'Concluida';
}
