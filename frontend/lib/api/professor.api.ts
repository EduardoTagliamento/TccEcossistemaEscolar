/**
 * API Client para Professor
 * 
 * Conceitos:
 * - Professor = Usuário com FuncaoId=3
 * - Alocação = Vínculo professor-matéria-turma
 * 
 * Fluxo de criação de professor:
 * 1. POST /api/professor (cria usuário + vincula função Professor)
 * 2. POST /api/professor/alocacao (vincula professor a matérias e turmas)
 */

// ==================== INTERFACES ====================

export interface Usuario {
  UsuarioCPF: string;
  UsuarioNome: string;
  UsuarioEmail: string | null;
  UsuarioTelefone: string | null;
  UsuarioDataNascimento: Date | null;
  UsuarioStatus: 'Ativo' | 'Inativo' | 'Bloqueado';
  // Nota: o backend (toProfessorDTO em professor.service.ts) ainda não inclui
  // UsuarioId na resposta de listagem de professores (diferente de aluno.api.ts,
  // que já recebe esse campo). Campo tipado aqui para manter os tipos alinhados
  // e permitir a busca por ID assim que o backend passar a retorná-lo.
  UsuarioId?: string | null;
}

export interface Professor extends Usuario {
  alocacoes?: Alocacao[];
}

export interface Alocacao {
  MatProfTurGUID: string;
  MateriaGUID: string;
  TurmaGUID: string;
  UsuarioCPF: string;
  AlocacaoStatus: 'Ativa' | 'Inativa';
  AulasPorSemana: number | null;
  MatProfTurCreatedAt: Date;
  MatProfTurUpdatedAt: Date;
}

export interface Materia {
  MateriaGUID: string;
  MateriaNome: string;
  EscolaGUID: string;
}

export interface Turma {
  TurmaGUID: string;
  TurmaNome: string;
  TurmaSerie: string;
  EscolaGUID: string;
}

// ==================== DTOs ====================

export interface ProfessorCreateDTO {
  UsuarioCPF: string;
  UsuarioNome: string;
  UsuarioEmail?: string;
  UsuarioTelefone?: string;
  UsuarioDataNascimento?: string;
  Materias?: string; // "Matemática, Física" (nomes separados por vírgula)
  Turmas?: string; // "1º Ano A, 2º Ano B" (nomes separados por vírgula)
}

export interface AlocacaoCreateDTO {
  MateriaGUID?: string;
  MateriaNome?: string;
  TurmaGUID?: string;
  TurmaNome?: string;
  UsuarioCPF: string;
  AlocacaoStatus?: 'Ativa' | 'Inativa';
  AulasPorSemana?: number | null;
}

export interface AlocacaoUpdateDTO {
  AlocacaoStatus?: 'Ativa' | 'Inativa';
  AulasPorSemana?: number | null;
}

export interface BatchItemResult {
  item: any;
  sucesso: boolean;
  mensagem: string;
  dados?: any;
  senhaTemporaria?: string;
  tipo: 'criado' | 'existente' | 'erro';
}

export interface BatchCreateResponse {
  totalProcessados: number;
  criados: number;
  existentes: number;
  erros: number;
  resultados: BatchItemResult[];
}

// ==================== FUNÇÕES DE API ====================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/**
 * Obter token do localStorage
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('@baua:token');
}

/**
 * Headers padrão com autenticação
 */
function getHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Criar professor individual
 * 
 * Fluxo:
 * 1. Cria usuário + vincula função Professor
 * 2. Se fornecidas matérias/turmas, cria alocações
 * 
 * @param dados Dados do professor
 * @param escolaGUID GUID da escola
 * @param escolaNome Nome da escola (para email)
 */
export async function criarProfessor(
  dados: ProfessorCreateDTO,
  escolaGUID: string,
  escolaNome: string
): Promise<{ professor: Professor }> {
  // 1. Criar professor (usuário + vínculo)
  const responseProfessor = await fetch(`${API_URL}/professor`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      professores: [dados],
      EscolaGUID: escolaGUID,
      EscolaNome: escolaNome,
      enviarEmails: true
    }),
  });

  if (!responseProfessor.ok) {
    const error = await responseProfessor.json();
    throw new Error(error.message || 'Erro ao criar professor');
  }

  const resultadoProfessor = await responseProfessor.json();

  if (resultadoProfessor.data.erros > 0) {
    const erro = resultadoProfessor.data.resultados.find((r: any) => r.tipo === 'erro');
    throw new Error(erro?.mensagem || 'Erro ao criar professor');
  }

  const professorCriado = resultadoProfessor.data.resultados[0].dados;

  // 2. Se fornecidas matérias e turmas, criar alocações
  if (dados.Materias && dados.Turmas) {
    const materias = dados.Materias.split(',').map(m => m.trim());
    const turmas = dados.Turmas.split(',').map(t => t.trim());

    const alocacoes: AlocacaoCreateDTO[] = [];

    // Criar todas as combinações matéria x turma
    for (const materia of materias) {
      for (const turma of turmas) {
        alocacoes.push({
          MateriaNome: materia,
          TurmaNome: turma,
          UsuarioCPF: dados.UsuarioCPF,
          AlocacaoStatus: 'Ativa'
        });
      }
    }

    // Criar alocações em massa
    await criarAlocacoesEmMassa(alocacoes, escolaGUID);
  }

  return {
    professor: professorCriado
  };
}

/**
 * Criar professores em massa
 * 
 * @param professores Array de professores
 * @param escolaGUID GUID da escola
 * @param escolaNome Nome da escola (para email)
 */
export async function criarProfessoresEmMassa(
  professores: ProfessorCreateDTO[],
  escolaGUID: string,
  escolaNome: string
): Promise<BatchCreateResponse> {
  // 1. Criar professores (usuários + vínculos)
  const responseProfessores = await fetch(`${API_URL}/professor`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      professores: professores,
      EscolaGUID: escolaGUID,
      EscolaNome: escolaNome,
      enviarEmails: true
    }),
  });

  if (!responseProfessores.ok) {
    const error = await responseProfessores.json();
    throw new Error(error.message || 'Erro ao criar professores');
  }

  const resultadoProfessores = await responseProfessores.json();
  const batchProfessores: BatchCreateResponse = resultadoProfessores.data;

  // 2. Criar alocações para todos os professores que têm matérias/turmas
  const todasAlocacoes: AlocacaoCreateDTO[] = [];

  for (const professor of professores) {
    if (professor.Materias && professor.Turmas) {
      const materias = professor.Materias.split(',').map(m => m.trim());
      const turmas = professor.Turmas.split(',').map(t => t.trim());

      // Criar todas as combinações matéria x turma
      for (const materia of materias) {
        for (const turma of turmas) {
          todasAlocacoes.push({
            MateriaNome: materia,
            TurmaNome: turma,
            UsuarioCPF: professor.UsuarioCPF,
            AlocacaoStatus: 'Ativa'
          });
        }
      }
    }
  }

  // 3. Criar alocações em massa (se houver)
  if (todasAlocacoes.length > 0) {
    await criarAlocacoesEmMassa(todasAlocacoes, escolaGUID);
  }

  return batchProfessores;
}

/**
 * Criar alocações em massa
 * 
 * @param alocacoes Array de alocações
 * @param escolaGUID GUID da escola
 */
export async function criarAlocacoesEmMassa(
  alocacoes: AlocacaoCreateDTO[],
  escolaGUID: string
): Promise<BatchCreateResponse> {
  const response = await fetch(`${API_URL}/professor/alocacao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      alocacoes: alocacoes,
      EscolaGUID: escolaGUID
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar alocações');
  }

  const resultado = await response.json();
  return resultado.data;
}

/**
 * Listar professores de uma escola
 * 
 * @param filters Filtros opcionais
 */
export async function listarProfessores(filters: {
  EscolaGUID: string;
}): Promise<{ professores: Professor[]; total: number }> {
  const query = new URLSearchParams();
  if (filters.EscolaGUID) query.append('EscolaGUID', filters.EscolaGUID);

  const response = await fetch(`${API_URL}/professor?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao listar professores');
  }

  const resultado = await response.json();

  return {
    professores: resultado.data,
    total: resultado.total,
  };
}

/**
 * Buscar alocações de um professor
 * 
 * @param cpf CPF do professor
 * @param escolaGUID GUID da escola
 */
export async function buscarAlocacoesProfessor(
  cpf: string,
  escolaGUID: string
): Promise<{ alocacoes: Alocacao[]; total: number }> {
  const response = await fetch(
    `${API_URL}/professor/${cpf}/escolas/${escolaGUID}/alocacoes`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao buscar alocações');
  }

  const resultado = await response.json();

  return {
    alocacoes: resultado.data,
    total: resultado.total,
  };
}

/**
 * Listar alocações com filtros opcionais
 */
export async function listarAlocacoes(filters: {
  MateriaGUID?: string;
  TurmaGUID?: string;
  UsuarioCPF?: string;
  AlocacaoStatus?: 'Ativa' | 'Inativa';
}): Promise<{ alocacoes: Alocacao[]; total: number }> {
  const query = new URLSearchParams();
  if (filters.MateriaGUID) query.append('MateriaGUID', filters.MateriaGUID);
  if (filters.TurmaGUID) query.append('TurmaGUID', filters.TurmaGUID);
  if (filters.UsuarioCPF) query.append('UsuarioCPF', filters.UsuarioCPF);
  if (filters.AlocacaoStatus) query.append('AlocacaoStatus', filters.AlocacaoStatus);

  const response = await fetch(`${API_URL}/professor/alocacao?${query.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao listar alocações');
  }

  const resultado = await response.json();
  return {
    alocacoes: resultado.data || [],
    total: resultado.total || 0,
  };
}

/**
 * Criar alocação individual (professor → matéria → turma)
 */
export async function criarAlocacao(
  alocacao: AlocacaoCreateDTO,
  escolaGUID: string
): Promise<Alocacao> {
  const response = await fetch(`${API_URL}/professor/alocacao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ alocacao, EscolaGUID: escolaGUID }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar alocação');
  }

  const resultado = await response.json();
  return resultado.data;
}

/**
 * Atualizar alocação (status e/ou override de aulas por semana)
 */
export async function atualizarAlocacao(
  alocacaoGUID: string,
  updates: AlocacaoUpdateDTO
): Promise<Alocacao> {
  const response = await fetch(`${API_URL}/professor/alocacao/${alocacaoGUID}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ alocacao: updates }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar alocação');
  }

  const resultado = await response.json();
  return resultado.data;
}

/**
 * Excluir alocação (soft delete)
 *
 * @param alocacaoGUID GUID da alocação
 */
export async function excluirAlocacao(alocacaoGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/professor/alocacao/${alocacaoGUID}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao excluir alocação');
  }
}

/**
 * Listar matérias disponíveis na escola
 * 
 * @param escolaGUID GUID da escola
 */
export async function listarMaterias(escolaGUID: string): Promise<Materia[]> {
  const response = await fetch(
    `${API_URL}/materia?EscolaGUID=${escolaGUID}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao listar matérias');
  }

  const resultado = await response.json();
  // Backend retorna { data: { materias: [...], total: N } }
  return resultado.data?.materias || resultado.data || [];
}

/**
 * Listar turmas disponíveis na escola
 * 
 * @param escolaGUID GUID da escola
 */
export async function listarTurmas(escolaGUID: string): Promise<Turma[]> {
  const response = await fetch(
    `${API_URL}/turma?EscolaGUID=${escolaGUID}`,
    {
      method: 'GET',
      headers: getHeaders(),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao listar turmas');
  }

  const resultado = await response.json();
  return resultado.data;
}

/**
 * Atualizar dados básicos do professor (usuário)
 * 
 * @param cpf CPF do professor
 * @param updates Dados a atualizar
 */
export async function atualizarProfessor(
  cpf: string,
  updates: {
    UsuarioNome?: string;
    UsuarioEmail?: string;
    UsuarioTelefone?: string;
    UsuarioDataNascimento?: string;
  }
): Promise<Usuario> {
  const response = await fetch(`${API_URL}/usuario/${cpf}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ usuario: updates }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao atualizar professor');
  }

  const resultado = await response.json();
  return resultado.data.usuario;
}

/**
 * Inativar vínculo professor-escola
 * (Atualiza Status para 'Inativo' na tabela escolaxusuarioxfuncao)
 * 
 * @param cpf CPF do professor
 * @param escolaGUID GUID da escola
 */
export async function inativarProfessor(cpf: string, escolaGUID: string): Promise<void> {
  const response = await fetch(`${API_URL}/escolaxusuarioxfuncao/${escolaGUID}/${cpf}/3`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao inativar professor');
  }
}

/**
 * Reativar professor
 * (Atualiza UsuarioStatus para 'Ativo')
 * 
 * @param cpf CPF do professor
 */
export async function reativarProfessor(cpf: string): Promise<void> {
  const response = await fetch(`${API_URL}/usuario/${cpf}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ usuario: { UsuarioStatus: 'Ativo' } }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao reativar professor');
  }
}
