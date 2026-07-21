/**
 * API Client para o Registro de Auditoria
 * Consulta read-only (quem fez o quê, quando, em qual entidade, por escola).
 * Visível apenas a Coordenação/Secretaria/Direção — o backend também aplica
 * essa restrição (403), este client não faz nenhuma checagem própria.
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

export type AcaoAuditoriaTipo = 'Create' | 'Update' | 'Delete';

export interface RegistroAuditoria {
  RegistroAuditoriaGUID: string;
  EscolaGUID: string;
  UsuarioCPFAtor: string;
  AcaoTipo: AcaoAuditoriaTipo;
  EntidadeTipo: string;
  EntidadeGUID: string;
  EntidadeDescricao: string | null;
  CategoriaAuditoriaId: number;
  CreatedAt: string;
}

export type CategoriaAuditoriaNome =
  | 'Trivial'
  | 'Operacional'
  | 'DadosPessoais'
  | 'Financeiro'
  | 'SegurancaConta';

export interface CategoriaAuditoria {
  CategoriaAuditoriaId: number;
  CategoriaAuditoriaNome: CategoriaAuditoriaNome;
  CategoriaAuditoriaRetencaoDias: number;
  CategoriaAuditoriaDescricao: string | null;
}

export interface AuditoriaFiltros {
  UsuarioCPFAtor?: string;
  AcaoTipo?: AcaoAuditoriaTipo;
  EntidadeTipo?: string;
  CategoriaAuditoriaId?: number;
  dataInicio?: string;
  dataFim?: string;
  limit?: number;
  offset?: number;
}

// ==================== READ ====================

export async function listarRegistros(
  escolaGUID: string,
  filtros: AuditoriaFiltros = {}
): Promise<{ registros: RegistroAuditoria[]; total: number }> {
  const params = new URLSearchParams();
  params.set('EscolaGUID', escolaGUID);

  if (filtros.UsuarioCPFAtor) params.set('UsuarioCPFAtor', filtros.UsuarioCPFAtor);
  if (filtros.AcaoTipo) params.set('AcaoTipo', filtros.AcaoTipo);
  if (filtros.EntidadeTipo) params.set('EntidadeTipo', filtros.EntidadeTipo);
  if (filtros.CategoriaAuditoriaId) params.set('CategoriaAuditoriaId', String(filtros.CategoriaAuditoriaId));
  if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.set('dataFim', filtros.dataFim);
  if (filtros.limit) params.set('limit', String(filtros.limit));
  if (filtros.offset) params.set('offset', String(filtros.offset));

  const response = await fetch(`${API_URL}/auditoria?${params.toString()}`, {
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar registros de auditoria');
  }

  return result.data;
}

export async function buscarRegistro(
  registroAuditoriaGUID: string,
  escolaGUID: string
): Promise<RegistroAuditoria> {
  const params = new URLSearchParams();
  params.set('EscolaGUID', escolaGUID);

  const response = await fetch(`${API_URL}/auditoria/${registroAuditoriaGUID}?${params.toString()}`, {
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao buscar registro de auditoria');
  }

  return result.data.registro;
}

export async function listarCategorias(): Promise<CategoriaAuditoria[]> {
  const response = await fetch(`${API_URL}/auditoria/categorias`, {
    headers: getHeaders(),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || 'Erro ao listar categorias de auditoria');
  }

  return result.data.categorias;
}

// ==================== LABELS (uso em telas) ====================

export const ACAO_AUDITORIA_LABEL: Record<AcaoAuditoriaTipo, string> = {
  Create: 'Criação',
  Update: 'Edição',
  Delete: 'Exclusão',
};

export const CATEGORIA_AUDITORIA_LABEL: Record<CategoriaAuditoriaNome, string> = {
  Trivial: 'Trivial',
  Operacional: 'Operacional',
  DadosPessoais: 'Dados pessoais',
  Financeiro: 'Financeiro',
  SegurancaConta: 'Segurança da conta',
};

export const ENTIDADE_TIPO_LABEL: Record<string, string> = {
  escola: 'Escola',
  escolaxusuarioxfuncao: 'Vínculo/função',
  matricula: 'Matrícula',
  turma: 'Turma',
  materia: 'Matéria',
  curso: 'Curso',
  horarioturma: 'Horário de turma',
  escolaconfiguracao: 'Configuração da escola',
  pendencia: 'Pendência',
  evento: 'Evento',
  conteudo: 'Conteúdo',
  tarefaacademica: 'Tarefa',
  provaagendada: 'Prova',
  anotacao: 'Anotação',
  grupotarefa: 'Grupo de tarefa',
  convitegrupotarefa: 'Convite de grupo de tarefa',
  projeto: 'Projeto',
  grupoprojeto: 'Grupo de projeto',
  convitegrupoprojeto: 'Convite de grupo de projeto',
};

export const ENTIDADE_TIPO_OPCOES: Array<{ valor: string; label: string }> = Object.entries(
  ENTIDADE_TIPO_LABEL
).map(([valor, label]) => ({ valor, label }));
