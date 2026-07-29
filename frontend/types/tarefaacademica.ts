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
  TarefaTipoEntrega: 'digital' | 'fisica' | 'lista';
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
  TarefaTipoEntrega: 'digital' | 'fisica' | 'lista';
  TarefaCompartilhada: boolean;
  TarefaMinPessoas: number | null;
  TarefaMaxPessoas: number | null;
  matXprofXturxescGUID: string;
}

// ========== Questão de tarefa "lista" (quiz estilo Forms) ==========

export interface AlternativaInput {
  AlternativaTexto: string;
  AlternativaCorreta: boolean;
  AlternativaPontos: number;
}

export interface Alternativa extends AlternativaInput {
  AlternativaGUID: string;
  AlternativaOrdem: number;
}

export interface QuestaoCreateInput {
  QuestaoEnunciado: string;
  QuestaoTipo: 'objetiva' | 'discursiva';
  QuestaoPontosMaximos: number;
  QuestaoExplicacao?: string | null;
  Alternativas?: AlternativaInput[];
  AnexosGUID?: string[];
}

export interface QuestaoUpdateInput {
  QuestaoEnunciado?: string;
  QuestaoTipo?: 'objetiva' | 'discursiva';
  QuestaoPontosMaximos?: number;
  QuestaoExplicacao?: string | null;
  Alternativas?: AlternativaInput[];
}

export interface QuestaoImportRow extends QuestaoCreateInput {
  /** Linha original na planilha (1-based) — usado só pra apontar o erro no lugar certo. */
  LinhaOriginal: number;
}

export interface ImportacaoErro {
  linha: number;
  mensagem: string;
}

export interface ImportacaoResultado {
  criadas: Questao[];
  count: number;
  erros: ImportacaoErro[];
}

export interface QuestaoAnexoResumo {
  AnexoGUID: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: string | null;
}

export interface Questao {
  QuestaoGUID: string;
  TarefaGUID: string;
  QuestaoEnunciado: string;
  QuestaoTipo: 'objetiva' | 'discursiva';
  QuestaoPontosMaximos: number;
  QuestaoExplicacao: string | null;
  QuestaoOrdem: number;
  Alternativas: Alternativa[];
  Anexos: QuestaoAnexoResumo[];
  TemResposta: boolean;
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface RespostaQuestao {
  RespostaGUID: string;
  QuestaoGUID: string;
  AlternativaGUID: string | null;
  RespostaTextoDiscursiva: string | null;
  RespostaPontosObtidos: number | null;
  RespostaAvaliadoEm: string | null;
  RespostaAvaliadoPorCPF: string | null;
  RespondidoEm: string | null;
}

/** Painel de correção do professor — Alternativas sempre completas (gabarito nunca mascarado). */
export interface QuestaoComRespostaProfessor {
  QuestaoGUID: string;
  QuestaoEnunciado: string;
  QuestaoTipo: 'objetiva' | 'discursiva';
  QuestaoPontosMaximos: number;
  QuestaoExplicacao: string | null;
  QuestaoOrdem: number;
  Alternativas: Alternativa[];
  Anexos: QuestaoAnexoResumo[];
  Resposta: {
    RespostaGUID: string;
    AlternativaGUID: string | null;
    RespostaTextoDiscursiva: string | null;
    RespostaPontosObtidos: number | null;
    RespostaAvaliadoPorCPF: string | null;
    RespondidoEm: string | null;
  } | null;
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
