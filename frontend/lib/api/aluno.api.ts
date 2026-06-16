/**
 * API Client para Alunos (Usuários + Matrículas)
 * 
 * Combina operações de usuario e matricula para facilitar
 * o gerenciamento de alunos no frontend.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ===== INTERFACES =====

export interface Usuario {
  UsuarioCPF: string;
  UsuarioEmail: string | null;
  UsuarioId: string | null;
  UsuarioTelefone: string | null;
  UsuarioNome: string;
  UsuarioEmailVerificado: boolean;
  UsuarioDataNascimento: string | null;
  UsuarioStatus: 'Ativo' | 'Inativo' | 'Bloqueado';
  UsuarioUltimoAcesso: string | null;
  UsuarioCreatedAt: string | null;
  UsuarioUpdatedAt: string | null;
}

export interface Matricula {
  MatriculaGUID: string;
  UsuarioCPF: string;
  TurmaGUID: string;
  MatriculaDataEntrada: Date;
  MatriculaDataSaida: Date | null;
  MatriculaStatus: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  MatriculaCreatedAt: Date;
  MatriculaUpdatedAt: Date;
}

// Aluno = Usuario + Matricula
export interface Aluno {
  usuario: Usuario;
  matricula: Matricula;
}

// DTOs para criação
export interface AlunoCreateDTO {
  // Dados do usuário
  UsuarioCPF: string;
  UsuarioNome: string;
  UsuarioEmail?: string;
  UsuarioTelefone?: string;
  UsuarioDataNascimento?: string;
  
  // Dados da matrícula
  TurmaGUID?: string;
  TurmaNome?: string; // Alternativa: nome da turma para resolução automática
}

// Batch interfaces
export interface BatchItemResult {
  item: any;
  sucesso: boolean;
  mensagem: string;
  dados?: any;
  senhaTemporaria?: string;
  tipo?: 'criado' | 'existente' | 'erro';
}

export interface BatchCreateResponse {
  totalProcessados: number;
  criados: number;
  existentes: number;
  erros: number;
  resultados: BatchItemResult[];
}

// ===== HELPER FUNCTIONS =====

function getAuthToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token') || '';
  }
  return '';
}

// ===== API FUNCTIONS =====

/**
 * Criar aluno (usuário + matrícula) em uma única operação
 */
export async function criarAluno(dados: AlunoCreateDTO, escolaGUID: string): Promise<Aluno> {
  try {
    // 1. Criar usuário
    const responseUsuario = await fetch(`${API_URL}/api/usuario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        usuario: {
          UsuarioCPF: dados.UsuarioCPF,
          UsuarioNome: dados.UsuarioNome,
          UsuarioEmail: dados.UsuarioEmail,
          UsuarioTelefone: dados.UsuarioTelefone,
          UsuarioDataNascimento: dados.UsuarioDataNascimento,
          UsuarioSenha: 'senha_temporaria_gerada_automaticamente', // Será substituída pelo service
          UsuarioStatus: 'Ativo'
        },
        escolaNome: 'Escola' // Será buscado automaticamente pelo backend
      })
    });

    if (!responseUsuario.ok) {
      const error = await responseUsuario.json();
      throw new Error(error.message || 'Erro ao criar usuário');
    }

    const dataUsuario = await responseUsuario.json();

    // 2. Criar matrícula
    const responseMatricula = await fetch(`${API_URL}/api/matricula`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        matricula: {
          UsuarioCPF: dados.UsuarioCPF,
          TurmaGUID: dados.TurmaGUID,
          TurmaNome: dados.TurmaNome
        }
      })
    });

    if (!responseMatricula.ok) {
      const error = await responseMatricula.json();
      throw new Error(error.message || 'Erro ao criar matrícula');
    }

    const dataMatricula = await responseMatricula.json();

    return {
      usuario: dataUsuario.data.usuario,
      matricula: dataMatricula.data
    };
  } catch (erro: any) {
    console.error('Erro ao criar aluno:', erro);
    throw erro;
  }
}

/**
 * Criar alunos em massa (usuários + matrículas)
 */
export async function criarAlunosEmMassa(
  alunos: AlunoCreateDTO[],
  escolaGUID: string,
  escolaNome: string
): Promise<BatchCreateResponse> {
  try {
    // 1. Criar usuários em massa
    const responseUsuarios = await fetch(`${API_URL}/api/usuario`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        usuarios: alunos.map(aluno => ({
          UsuarioCPF: aluno.UsuarioCPF,
          UsuarioNome: aluno.UsuarioNome,
          UsuarioEmail: aluno.UsuarioEmail,
          UsuarioTelefone: aluno.UsuarioTelefone,
          UsuarioDataNascimento: aluno.UsuarioDataNascimento,
          UsuarioSenha: 'senha_temporaria_gerada_automaticamente',
          UsuarioStatus: 'Ativo',
          TurmaNome: aluno.TurmaNome // Para o email
        })),
        escolaNome,
        enviarEmails: true
      })
    });

    if (!responseUsuarios.ok) {
      const error = await responseUsuarios.json();
      throw new Error(error.message || 'Erro ao criar usuários');
    }

    const resultadoUsuarios = await responseUsuarios.json();

    // 2. Criar matrículas em massa (apenas para usuários criados ou existentes)
    const cpfsParaMatricular = resultadoUsuarios.data.resultados
      .filter((r: BatchItemResult) => r.sucesso)
      .map((r: BatchItemResult) => r.item.UsuarioCPF);

    const responseMatriculas = await fetch(`${API_URL}/api/matricula`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        matriculas: alunos
          .filter(aluno => cpfsParaMatricular.includes(aluno.UsuarioCPF))
          .map(aluno => ({
            UsuarioCPF: aluno.UsuarioCPF,
            TurmaGUID: aluno.TurmaGUID,
            TurmaNome: aluno.TurmaNome
          })),
        escolaGUID
      })
    });

    if (!responseMatriculas.ok) {
      const error = await responseMatriculas.json();
      throw new Error(error.message || 'Erro ao criar matrículas');
    }

    const resultadoMatriculas = await responseMatriculas.json();

    // 3. Consolidar resultados
    return {
      totalProcessados: resultadoUsuarios.data.totalProcessados,
      criados: resultadoMatriculas.data.criados,
      existentes: resultadoMatriculas.data.existentes,
      erros: resultadoUsuarios.data.erros + resultadoMatriculas.data.erros,
      resultados: [
        ...resultadoUsuarios.data.resultados,
        ...resultadoMatriculas.data.resultados
      ]
    };
  } catch (erro: any) {
    console.error('Erro ao criar alunos em massa:', erro);
    throw erro;
  }
}

/**
 * Listar alunos (com dados de usuário e matrícula)
 */
export async function listarAlunos(filtros: {
  EscolaGUID?: string;
  TurmaGUID?: string;
  MatriculaStatus?: string;
}): Promise<{ alunos: Aluno[]; total: number }> {
  try {
    // Buscar matrículas
    const queryParams = new URLSearchParams();
    if (filtros.TurmaGUID) queryParams.append('TurmaGUID', filtros.TurmaGUID);
    if (filtros.MatriculaStatus) queryParams.append('MatriculaStatus', filtros.MatriculaStatus);

    const response = await fetch(`${API_URL}/api/matricula?${queryParams}`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar matrículas');
    }

    const data = await response.json();
    const matriculas: Matricula[] = data.data;

    // Buscar dados de usuários para cada matrícula
    const alunosPromises = matriculas.map(async (matricula) => {
      const responseUsuario = await fetch(`${API_URL}/api/usuario/${matricula.UsuarioCPF}`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });

      if (!responseUsuario.ok) {
        console.error(`Erro ao buscar usuário ${matricula.UsuarioCPF}`);
        return null;
      }

      const dataUsuario = await responseUsuario.json();
      return {
        usuario: dataUsuario.data.usuario,
        matricula
      };
    });

    const alunos = (await Promise.all(alunosPromises)).filter(Boolean) as Aluno[];

    return {
      alunos,
      total: alunos.length
    };
  } catch (erro: any) {
    console.error('Erro ao listar alunos:', erro);
    throw erro;
  }
}

/**
 * Transferir aluno para outra turma
 */
export async function transferirAluno(
  cpf: string,
  turmaOrigemGUID: string,
  turmaDestinoGUID: string
): Promise<{ matriculaAnterior: Matricula; matriculaNova: Matricula }> {
  try {
    const response = await fetch(`${API_URL}/api/matricula/transferir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        transferencia: {
          UsuarioCPF: cpf,
          TurmaOrigemGUID: turmaOrigemGUID,
          TurmaDestinoGUID: turmaDestinoGUID,
          DataTransferencia: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao transferir aluno');
    }

    const data = await response.json();
    return data.data;
  } catch (erro: any) {
    console.error('Erro ao transferir aluno:', erro);
    throw erro;
  }
}

/**
 * Excluir aluno (cancela matrícula)
 */
export async function excluirAluno(matriculaGUID: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/api/matricula/${matriculaGUID}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao excluir aluno');
    }
  } catch (erro: any) {
    console.error('Erro ao excluir aluno:', erro);
    throw erro;
  }
}

/**
 * Atualizar matrícula do aluno (ex: trocar turma)
 */
export async function atualizarMatricula(
  matriculaGUID: string,
  updates: {
    TurmaGUID?: string;
    MatriculaStatus?: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  }
): Promise<Matricula> {
  try {
    const response = await fetch(`${API_URL}/api/matricula/${matriculaGUID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ matricula: updates })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro ao atualizar matrícula');
    }

    const data = await response.json();
    return data.data;
  } catch (erro: any) {
    console.error('Erro ao atualizar matrícula:', erro);
    throw erro;
  }
}
