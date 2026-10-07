/**
 * API Client para o Banco de Questões universal (spec item 11-13).
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('@baua:token') || '';
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export type QuestaoBancoDificuldade = 'Facil' | 'Media' | 'Dificil';

export interface AnexoQuestaoBanco {
  AnexoGUID: string;
  AnexoCaminho: string;
  AnexoNomeOriginal: string | null;
}

export interface AlternativaQuestaoBanco {
  AlternativaGUID: string;
  AlternativaTexto: string;
  AlternativaCorreta: boolean;
  AlternativaOrdem: number;
  Anexos: AnexoQuestaoBanco[];
}

export type QuestaoBancoStatus = 'Pendente' | 'Validado';

export interface QuestaoBanco {
  QuestaoBancoGUID: string;
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Ano: number | null;
  Dificuldade: QuestaoBancoDificuldade;
  Status: QuestaoBancoStatus;
  Enunciado: string;
  VideoResolucaoUrl: string | null;
  Alternativas: AlternativaQuestaoBanco[];
  Anexos: AnexoQuestaoBanco[];
  CreatedAt: string | null;
}

export interface Vestibular {
  VestibularGUID: string;
  Nome: string;
}

export interface QuestaoBancoCreateDados {
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Dificuldade: QuestaoBancoDificuldade;
  Enunciado: string;
  VideoResolucaoUrl?: string;
  Alternativas: { Texto: string; Correta: boolean }[];
}

export interface FiltrosBancoQuestoes {
  vestibularGUIDs?: string[];
  anos?: number[];
  dificuldades?: QuestaoBancoDificuldade[];
}

function anexarFiltrosMultiplos(params: URLSearchParams, filtros?: FiltrosBancoQuestoes): void {
  if (filtros?.vestibularGUIDs && filtros.vestibularGUIDs.length > 0) {
    params.append('VestibularGUIDs', filtros.vestibularGUIDs.join(','));
  }
  if (filtros?.anos && filtros.anos.length > 0) {
    params.append('Anos', filtros.anos.join(','));
  }
  if (filtros?.dificuldades && filtros.dificuldades.length > 0) {
    params.append('Dificuldades', filtros.dificuldades.join(','));
  }
}

export async function listarQuestoes(filtros?: {
  MateriaGlobalGUID?: string;
  SubMateriaGlobalGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
  VestibularGUID?: string;
} & FiltrosBancoQuestoes): Promise<QuestaoBanco[]> {
  const params = new URLSearchParams();
  if (filtros?.MateriaGlobalGUID) params.append('MateriaGlobalGUID', filtros.MateriaGlobalGUID);
  if (filtros?.SubMateriaGlobalGUID) params.append('SubMateriaGlobalGUID', filtros.SubMateriaGlobalGUID);
  if (filtros?.Dificuldade) params.append('Dificuldade', filtros.Dificuldade);
  if (filtros?.VestibularGUID) params.append('VestibularGUID', filtros.VestibularGUID);
  anexarFiltrosMultiplos(params, filtros);

  const response = await fetch(`${API_URL}/questaobanco?${params}`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar questões');
  return result.data?.questoes || [];
}

/** Busca individual — usado pra "refazer essa questão" a partir do histórico. */
export async function buscarQuestao(guid: string): Promise<QuestaoBanco> {
  const response = await fetch(`${API_URL}/questaobanco/${guid}`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao buscar questão');
  return result.data.questao;
}

export interface ContagemQuestoes {
  PorMateria: { MateriaGlobalGUID: string; Quantidade: number }[];
  PorSubMateria: { SubMateriaGlobalGUID: string; Quantidade: number }[];
}

/** Só conta Status='Validado' — alimenta os cards de matéria/submatéria com "N questões",
 * recalculando ao vivo conforme os filtros de vestibular/ano/dificuldade. */
export async function contarQuestoesValidadas(filtros?: FiltrosBancoQuestoes): Promise<ContagemQuestoes> {
  const params = new URLSearchParams();
  anexarFiltrosMultiplos(params, filtros);
  const response = await fetch(`${API_URL}/questaobanco/contagem?${params}`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao contar questões');
  return result.data;
}

/** Anos com pelo menos 1 questão Validada — alimenta o modal de filtro de Ano. */
export async function listarAnosDisponiveis(): Promise<number[]> {
  const response = await fetch(`${API_URL}/questaobanco/anos`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar anos');
  return result.data?.anos || [];
}

export async function criarQuestao(dados: QuestaoBancoCreateDados): Promise<QuestaoBanco> {
  const response = await fetch(`${API_URL}/questaobanco`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao criar questão');
  return result.data.questao;
}

export async function excluirQuestao(guid: string): Promise<void> {
  const response = await fetch(`${API_URL}/questaobanco/${guid}`, { method: 'DELETE', headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao excluir questão');
}

/** Fila de validação — só Status='Pendente' (admin, nunca exposto na listagem pública). */
export async function listarPendentes(filtros?: { MateriaGlobalGUID?: string; SubMateriaGlobalGUID?: string }): Promise<QuestaoBanco[]> {
  const params = new URLSearchParams();
  if (filtros?.MateriaGlobalGUID) params.append('MateriaGlobalGUID', filtros.MateriaGlobalGUID);
  if (filtros?.SubMateriaGlobalGUID) params.append('SubMateriaGlobalGUID', filtros.SubMateriaGlobalGUID);

  const response = await fetch(`${API_URL}/questaobanco/pendentes?${params}`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar questões pendentes');
  return result.data?.questoes || [];
}

export interface QuestaoBancoUpdateDados {
  MateriaGlobalGUID?: string;
  SubMateriaGlobalGUID?: string;
  VestibularGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
  Enunciado?: string;
  VideoResolucaoUrl?: string | null;
  /** Substitui o conjunto inteiro de alternativas (não faz merge incremental). */
  Alternativas?: { Texto: string; Correta: boolean; AnexoGUIDs?: string[] }[];
  /** Substitui o conjunto inteiro de anexos do enunciado. */
  AnexoGUIDs?: string[];
}

export async function atualizarQuestao(guid: string, dados: QuestaoBancoUpdateDados): Promise<QuestaoBanco> {
  const response = await fetch(`${API_URL}/questaobanco/${guid}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(dados),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao atualizar questão');
  return result.data.questao;
}

export async function validarQuestao(guid: string): Promise<QuestaoBanco> {
  const response = await fetch(`${API_URL}/questaobanco/${guid}/validar`, { method: 'PATCH', headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao validar questão');
  return result.data.questao;
}

export async function listarVestibulares(): Promise<Vestibular[]> {
  const response = await fetch(`${API_URL}/questaobanco/vestibular`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar vestibulares');
  return result.data?.vestibulares || [];
}

export interface QuestaoHistorico {
  QuestaoBancoGUID: string;
  EnunciadoPreview: string;
  Dificuldade: QuestaoBancoDificuldade;
  VestibularGUID: string;
  Acertou: boolean | null;
  FeitaEm: string | null;
  MarcadaEm: string | null;
}

/** Marca a questão como Feita pra esse aluno (sai do pool de randomização da prática). */
export async function registrarResposta(guid: string, acertou: boolean): Promise<void> {
  const response = await fetch(`${API_URL}/questaobanco/${guid}/progresso`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ Acertou: acertou }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao registrar resposta');
}

/** "Revisitar" — desmarca Feita, a questão volta a entrar na randomização da prática. */
export async function desmarcarFeita(guid: string): Promise<void> {
  const response = await fetch(`${API_URL}/questaobanco/${guid}/progresso`, { method: 'DELETE', headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao desmarcar questão');
}

/** Marcar/desmarcar pra ver depois — independente de Feita. */
export async function definirMarcada(guid: string, marcada: boolean): Promise<void> {
  const response = await fetch(`${API_URL}/questaobanco/${guid}/marcar`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ Marcada: marcada }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao marcar questão');
}

export async function listarHistorico(
  status: 'Feitas' | 'Marcadas',
  filtros?: { VestibularGUID?: string; Dificuldade?: QuestaoBancoDificuldade; Acertou?: boolean }
): Promise<QuestaoHistorico[]> {
  const params = new URLSearchParams({ Status: status });
  if (filtros?.VestibularGUID) params.append('VestibularGUID', filtros.VestibularGUID);
  if (filtros?.Dificuldade) params.append('Dificuldade', filtros.Dificuldade);
  if (filtros?.Acertou !== undefined) params.append('Acertou', String(filtros.Acertou));

  const response = await fetch(`${API_URL}/questaobanco/progresso?${params}`, { headers: getHeaders() });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao listar histórico');
  return result.data?.questoes || [];
}

export async function criarVestibular(nome: string): Promise<Vestibular> {
  const response = await fetch(`${API_URL}/questaobanco/vestibular`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ Nome: nome }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || 'Erro ao criar vestibular');
  return result.data.vestibular;
}
