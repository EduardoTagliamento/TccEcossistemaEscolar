import Matricula from "../entities/matricula.model";
import { MatriculaDAO, MatriculaFilters } from "../repositories/matricula.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import MysqlDatabase from "../database/MysqlDatabase";
import ErrorResponse from "../utils/ErrorResponse";
import { v4 as uuidv4 } from "uuid";

/**
 * DTOs para transferência de dados
 */
export interface MatriculaDTO {
  MatriculaGUID: string;
  UsuarioCPF: string;
  TurmaGUID: string;
  MatriculaDataEntrada: Date;
  MatriculaDataSaida: Date | null;
  MatriculaStatus: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  MatriculaCreatedAt: Date;
  MatriculaUpdatedAt: Date;
}

export interface MatriculaCreateDTO {
  MatriculaGUID?: string; // Opcional: RA customizado OU gera UUID
  UsuarioCPF: string;
  TurmaGUID?: string; // GUID da turma
  TurmaNome?: string; // NOME da turma (para resolução automática)
  MatriculaDataEntrada?: Date;
}

export interface MatriculaUpdateDTO {
  MatriculaDataEntrada?: Date;
  MatriculaDataSaida?: Date | null;
  MatriculaStatus?: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
}

export interface TransferenciaDTO {
  UsuarioCPF: string;
  TurmaOrigemGUID: string;
  TurmaDestinoGUID: string;
  DataTransferencia: Date;
}

// Interfaces para operações em massa
export interface BatchMatriculaItemResult {
  item: MatriculaCreateDTO;
  sucesso: boolean;
  mensagem: string;
  dados?: MatriculaDTO;
  tipo?: 'criado' | 'existente' | 'erro';
}

export interface BatchMatriculaCreateResponse {
  totalProcessados: number;
  criados: number;
  existentes: number; // Aluno já tinha matrícula ativa
  erros: number;
  resultados: BatchMatriculaItemResult[];
}

/**
 * Service para lógica de negócio de Matrícula
 * 
 * Regras principais:
 * - MatriculaGUID: aceita RA customizado OU gera UUID automaticamente
 * - Um aluno só pode ter UMA matrícula ativa por vez
 * - Transferência: operação transacional atômica (COMMIT/ROLLBACK)
 * - Autorização: Coordenação (FuncaoId 1) ou Direção (FuncaoId 6)
 */
export default class MatriculaService {
  #matriculaDAO: MatriculaDAO;
  #turmaDAO: TurmaDAO;
  #usuarioDAO: UsuarioDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;
  #database: MysqlDatabase;

  constructor(
    matriculaDAO: MatriculaDAO,
    turmaDAO: TurmaDAO,
    usuarioDAO: UsuarioDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO,
    database: MysqlDatabase
  ) {
    this.#matriculaDAO = matriculaDAO;
    this.#turmaDAO = turmaDAO;
    this.#usuarioDAO = usuarioDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
    this.#database = database;
  }

  /**
   * Criar nova matrícula
   * 
   * Validações:
   * 1. Turma existe
   * 2. Usuário tem permissão (Coordenação ou Direção)
   * 3. Usuário (aluno) existe
   * 4. Aluno não possui matrícula ativa
   * 5. MatriculaGUID: usa fornecido OU gera UUID
   */
  async criarMatricula(data: MatriculaCreateDTO, usuarioCPF: string): Promise<MatriculaDTO> {
    // 1. Validar que turma existe
    const turma = await this.#turmaDAO.findById(data.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: `Não existe turma com id ${data.TurmaGUID}`,
      });
    }

    // 2. Validar permissão de escrita
    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    // 3. Validar que usuário (aluno) existe
    const usuario = await this.#usuarioDAO.findByCPF(data.UsuarioCPF);
    if (!usuario) {
      throw new ErrorResponse(404, 'Usuário não encontrado', {
        message: `Não existe usuário com CPF ${data.UsuarioCPF}`,
      });
    }

    // 4. Validar se aluno já possui matrícula ativa
    const matriculaAtiva = await this.#matriculaDAO.findMatriculaAtivaByUsuario(
      data.UsuarioCPF
    );
    if (matriculaAtiva) {
      throw new ErrorResponse(409, 'Aluno já possui matrícula ativa', {
        message: 'O aluno já está matriculado em uma turma. Use a transferência se necessário.',
        matriculaAtiva: {
          MatriculaGUID: matriculaAtiva.MatriculaGUID,
          TurmaGUID: matriculaAtiva.TurmaGUID,
          MatriculaDataEntrada: matriculaAtiva.MatriculaDataEntrada,
        },
      });
    }

    // 5. MatriculaGUID: usar fornecido OU gerar UUID
    const matriculaGUID = data.MatriculaGUID?.trim() || uuidv4();

    // 6. Criar entidade
    const matricula = new Matricula();
    matricula.MatriculaGUID = matriculaGUID;
    matricula.UsuarioCPF = data.UsuarioCPF;
    matricula.TurmaGUID = data.TurmaGUID;
    matricula.MatriculaDataEntrada = data.MatriculaDataEntrada || new Date();
    matricula.MatriculaDataSaida = null;
    matricula.MatriculaStatus = 'Ativa';
    matricula.MatriculaCreatedAt = new Date();
    matricula.MatriculaUpdatedAt = new Date();

    matricula.validar();

    // 7. Persistir
    const matriculaCriada = await this.#matriculaDAO.create(matricula);

    return this.toDTO(matriculaCriada);
  }

  /**
   * Transferir aluno entre turmas (operação TRANSACIONAL)
   * 
   * Fluxo:
   * 1. BEGIN TRANSACTION
   * 2. Validar turmas origem e destino
   * 3. Validar permissão
   * 4. Buscar matrícula ativa na origem
   * 5. Encerrar matrícula origem (status=Transferida, DataSaida)
   * 6. Criar nova matrícula no destino
   * 7. COMMIT
   * 
   * Se houver erro em qualquer etapa: ROLLBACK
   */
  async transferirAluno(data: TransferenciaDTO, usuarioCPF: string): Promise<{
    matriculaAnterior: MatriculaDTO;
    matriculaNova: MatriculaDTO;
  }> {
    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();

    try {
      // BEGIN TRANSACTION
      await connection.beginTransaction();

      // 1. Validar turma origem
      const turmaOrigem = await this.#turmaDAO.findById(data.TurmaOrigemGUID);
      if (!turmaOrigem) {
        throw new ErrorResponse(404, 'Turma origem não encontrada', {
          message: `Não existe turma com id ${data.TurmaOrigemGUID}`,
        });
      }

      // 2. Validar turma destino
      const turmaDestino = await this.#turmaDAO.findById(data.TurmaDestinoGUID);
      if (!turmaDestino) {
        throw new ErrorResponse(404, 'Turma destino não encontrada', {
          message: `Não existe turma com id ${data.TurmaDestinoGUID}`,
        });
      }

      // 3. Validar permissão (na escola de origem)
      await this.validarPermissaoEscrita(usuarioCPF, turmaOrigem.EscolaGUID);

      // 4. Buscar matrícula ativa na turma origem
      const queryBuscar = `
        SELECT * FROM matricula 
        WHERE UsuarioCPF = ? 
          AND TurmaGUID = ? 
          AND MatriculaStatus = 'Ativa'
        LIMIT 1
      `;

      const [rows] = await connection.execute(queryBuscar, [
        data.UsuarioCPF,
        data.TurmaOrigemGUID,
      ]);

      if (!Array.isArray(rows) || rows.length === 0) {
        throw new ErrorResponse(404, 'Matrícula ativa não encontrada', {
          message: 'O aluno não possui matrícula ativa na turma de origem',
        });
      }

      const matriculaOrigem = rows[0] as any;

      // 5. Encerrar matrícula origem
      const queryEncerrar = `
        UPDATE matricula 
        SET MatriculaStatus = 'Transferida',
            MatriculaDataSaida = ?,
            MatriculaUpdatedAt = ?
        WHERE MatriculaGUID = ?
      `;

      await connection.execute(queryEncerrar, [
        data.DataTransferencia,
        new Date(),
        matriculaOrigem.MatriculaGUID,
      ]);

      // 6. Criar nova matrícula no destino
      const novaMatricula = new Matricula();
      novaMatricula.MatriculaGUID = uuidv4(); // Sempre gera novo UUID na transferência
      novaMatricula.UsuarioCPF = data.UsuarioCPF;
      novaMatricula.TurmaGUID = data.TurmaDestinoGUID;
      novaMatricula.MatriculaDataEntrada = data.DataTransferencia;
      novaMatricula.MatriculaDataSaida = null;
      novaMatricula.MatriculaStatus = 'Ativa';
      novaMatricula.MatriculaCreatedAt = new Date();
      novaMatricula.MatriculaUpdatedAt = new Date();

      const queryInserir = `
        INSERT INTO matricula 
        (MatriculaGUID, UsuarioCPF, TurmaGUID, MatriculaDataEntrada, 
         MatriculaDataSaida, MatriculaStatus, MatriculaCreatedAt, MatriculaUpdatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(queryInserir, [
        novaMatricula.MatriculaGUID,
        novaMatricula.UsuarioCPF,
        novaMatricula.TurmaGUID,
        novaMatricula.MatriculaDataEntrada,
        novaMatricula.MatriculaDataSaida,
        novaMatricula.MatriculaStatus,
        novaMatricula.MatriculaCreatedAt,
        novaMatricula.MatriculaUpdatedAt,
      ]);

      // COMMIT
      await connection.commit();

      // Retornar dados das duas matrículas
      return {
        matriculaAnterior: {
          MatriculaGUID: matriculaOrigem.MatriculaGUID,
          UsuarioCPF: matriculaOrigem.UsuarioCPF,
          TurmaGUID: matriculaOrigem.TurmaGUID,
          MatriculaDataEntrada: matriculaOrigem.MatriculaDataEntrada,
          MatriculaDataSaida: data.DataTransferencia,
          MatriculaStatus: 'Transferida' as const,
          MatriculaCreatedAt: matriculaOrigem.MatriculaCreatedAt,
          MatriculaUpdatedAt: new Date(),
        },
        matriculaNova: this.toDTO(novaMatricula),
      };
    } catch (error) {
      // ROLLBACK em caso de erro
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Listar matrículas com filtros
   */
  async listarMatriculas(filters?: MatriculaFilters): Promise<{
    matriculas: MatriculaDTO[];
    total: number;
  }> {
    const matriculas = await this.#matriculaDAO.findAll(filters);
    
    return {
      matriculas: matriculas.map((matricula) => this.toDTO(matricula)),
      total: matriculas.length,
    };
  }

  /**
   * Buscar matrícula por GUID
   */
  async buscarMatricula(matriculaGUID: string): Promise<MatriculaDTO> {
    const matricula = await this.#matriculaDAO.findById(matriculaGUID);

    if (!matricula) {
      throw new ErrorResponse(404, 'Matrícula não encontrada', {
        message: `Não existe matrícula com id ${matriculaGUID}`,
      });
    }

    return this.toDTO(matricula);
  }

  /**
   * Atualizar matrícula
   */
  async atualizarMatricula(
    matriculaGUID: string,
    data: MatriculaUpdateDTO,
    usuarioCPF: string
  ): Promise<MatriculaDTO> {
    // 1. Buscar matrícula
    const matriculaExistente = await this.#matriculaDAO.findById(matriculaGUID);
    if (!matriculaExistente) {
      throw new ErrorResponse(404, 'Matrícula não encontrada', {
        message: `Não existe matrícula com id ${matriculaGUID}`,
      });
    }

    // 2. Buscar turma para validar permissão
    const turma = await this.#turmaDAO.findById(matriculaExistente.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: 'Turma vinculada não existe',
      });
    }

    // 3. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    // 4. Atualizar
    const matriculaAtualizada = await this.#matriculaDAO.update(matriculaGUID, data);

    if (!matriculaAtualizada) {
      throw new ErrorResponse(500, 'Erro ao atualizar matrícula', {
        message: 'Não foi possível atualizar a matrícula',
      });
    }

    return this.toDTO(matriculaAtualizada);
  }

  /**
   * Excluir matrícula (cancela)
   */
  async excluirMatricula(matriculaGUID: string, usuarioCPF: string): Promise<void> {
    // 1. Buscar matrícula
    const matricula = await this.#matriculaDAO.findById(matriculaGUID);
    if (!matricula) {
      throw new ErrorResponse(404, 'Matrícula não encontrada', {
        message: `Não existe matrícula com id ${matriculaGUID}`,
      });
    }

    // 2. Buscar turma para validar permissão
    const turma = await this.#turmaDAO.findById(matricula.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: 'Turma vinculada não existe',
      });
    }

    // 3. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    // 4. Cancelar
    const deletado = await this.#matriculaDAO.delete(matriculaGUID);

    if (!deletado) {
      throw new ErrorResponse(500, 'Erro ao cancelar matrícula', {
        message: 'Não foi possível cancelar a matrícula',
      });
    }
  }

  /**
   * Valida se usuário tem permissão de escrita na escola
   * (FuncaoId 1 = Coordenação ou FuncaoId 6 = Direção)
   */
  private async validarPermissaoEscrita(
    usuarioCPF: string,
    escolaGUID: string
  ): Promise<void> {
    // Validar Coordenação (FuncaoId = 1)
    const coordenacao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(
      usuarioCPF,
      escolaGUID,
      1
    );

    if (coordenacao && coordenacao.Status === 'Ativo') {
      return; // Tem permissão
    }

    // Validar Direção (FuncaoId = 6)
    const direcao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(
      usuarioCPF,
      escolaGUID,
      6
    );

    if (direcao && direcao.Status === 'Ativo') {
      return; // Tem permissão
    }

    // Sem permissão
    throw new ErrorResponse(403, 'Sem permissão', {
      message: 'Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar matrículas.',
    });
  }

  /**
   * Converte entidade Matricula para DTO
   */
  private toDTO(matricula: Matricula): MatriculaDTO {
    return {
      MatriculaGUID: matricula.MatriculaGUID,
      UsuarioCPF: matricula.UsuarioCPF,
      TurmaGUID: matricula.TurmaGUID,
      MatriculaDataEntrada: matricula.MatriculaDataEntrada,
      MatriculaDataSaida: matricula.MatriculaDataSaida,
      MatriculaStatus: matricula.MatriculaStatus,
      MatriculaCreatedAt: matricula.MatriculaCreatedAt,
      MatriculaUpdatedAt: matricula.MatriculaUpdatedAt,
    };
  }

  /**
   * Criar matrículas em massa (para importação de planilhas)
   * 
   * Suporta resolução de turma por nome:
   * - Se TurmaGUID fornecido: usa diretamente
   * - Se TurmaNome fornecido: busca turma pelo nome na escola
   * 
   * Lógica:
   * - Valida permissão uma única vez (não para cada matrícula)
   * - Busca todas as turmas da escola (para resolução de nomes)
   * - Para cada matrícula:
   *   * Resolve TurmaNome → TurmaGUID (se necessário)
   *   * Verifica se aluno já tem matrícula ativa
   *   * Cria matrícula se tudo ok
   * - Continua processamento mesmo com erros individuais
   * 
   * @param matriculas - Array de matrículas para criar
   * @param escolaGUID - GUID da escola
   * @param usuarioCPF - CPF do usuário que está criando
   * @returns BatchMatriculaCreateResponse com resultados detalhados
   */
  async criarMatriculasEmMassa(
    matriculas: MatriculaCreateDTO[],
    escolaGUID: string,
    usuarioCPF: string
  ): Promise<BatchMatriculaCreateResponse> {
    // 1. Validar permissão uma única vez
    await this.validarPermissaoEscrita(usuarioCPF, escolaGUID);

    // 2. Buscar todas as turmas da escola (para resolução de nomes)
    const turmasDaEscola = await this.#turmaDAO.findAll({ EscolaGUID: escolaGUID });

    // Criar mapa: nome → GUID (case-insensitive)
    const mapaTurmaNomeParaGUID = new Map<string, string>();
    for (const turma of turmasDaEscola) {
      const chave = `${turma.TurmaSerie.toLowerCase()}|${turma.TurmaNome.toLowerCase()}`;
      mapaTurmaNomeParaGUID.set(chave, turma.TurmaGUID);
    }

    // 3. Buscar matrículas ativas existentes (para detecção de duplicatas)
    const matriculasAtivas = await this.#matriculaDAO.findAll({
      EscolaGUID: escolaGUID,
      MatriculaStatus: 'Ativa'
    });

    // Criar Set de alunos com matrícula ativa
    const alunosComMatriculaAtiva = new Set(
      matriculasAtivas.map(m => m.UsuarioCPF)
    );

    // 4. Processar cada matrícula
    const resultados: BatchMatriculaItemResult[] = [];
    let criados = 0;
    let existentes = 0;
    let erros = 0;

    for (const dados of matriculas) {
      try {
        let turmaGUID: string;

        // Resolver TurmaGUID
        if (dados.TurmaGUID) {
          turmaGUID = dados.TurmaGUID;
        } else if (dados.TurmaNome) {
          // Resolver pelo nome
          // Formato esperado: "Série Nome" ou usar campos separados
          const nomeBusca = dados.TurmaNome.toLowerCase();
          
          // Tentar busca direta no mapa (assumindo formato "Série Nome")
          let encontrado = false;
          for (const [chave, guid] of mapaTurmaNomeParaGUID.entries()) {
            // Reconstruir nome completo da turma
            const [serie, nome] = chave.split('|');
            const nomeCompleto = `${serie} ${nome}`;
            
            if (nomeCompleto === nomeBusca || chave.replace('|', ' ') === nomeBusca) {
              turmaGUID = guid;
              encontrado = true;
              break;
            }
          }

          if (!encontrado) {
            resultados.push({
              item: dados,
              sucesso: false,
              mensagem: `Turma "${dados.TurmaNome}" não encontrada na escola`,
              tipo: 'erro'
            });
            erros++;
            continue;
          }
        } else {
          resultados.push({
            item: dados,
            sucesso: false,
            mensagem: 'TurmaGUID ou TurmaNome é obrigatório',
            tipo: 'erro'
          });
          erros++;
          continue;
        }

        // Verificar se turma existe
        const turma = await this.#turmaDAO.findById(turmaGUID);
        if (!turma) {
          resultados.push({
            item: dados,
            sucesso: false,
            mensagem: `Turma não encontrada (GUID: ${turmaGUID})`,
            tipo: 'erro'
          });
          erros++;
          continue;
        }

        // Verificar se aluno já tem matrícula ativa
        if (alunosComMatriculaAtiva.has(dados.UsuarioCPF)) {
          // Buscar matrícula ativa do aluno
          const matriculaAtiva = matriculasAtivas.find(m => m.UsuarioCPF === dados.UsuarioCPF);
          
          resultados.push({
            item: dados,
            sucesso: true,
            mensagem: 'Aluno já possui matrícula ativa',
            dados: matriculaAtiva ? this.toDTO(matriculaAtiva) : undefined,
            tipo: 'existente'
          });
          existentes++;
          continue;
        }

        // Criar nova matrícula
        const novaMatricula = new Matricula();
        novaMatricula.MatriculaGUID = dados.MatriculaGUID || uuidv4();
        novaMatricula.UsuarioCPF = dados.UsuarioCPF;
        novaMatricula.TurmaGUID = turmaGUID;
        novaMatricula.MatriculaDataEntrada = dados.MatriculaDataEntrada || new Date();
        novaMatricula.MatriculaDataSaida = null;
        novaMatricula.MatriculaStatus = 'Ativa';
        novaMatricula.MatriculaCreatedAt = new Date();
        novaMatricula.MatriculaUpdatedAt = new Date();

        await this.#matriculaDAO.create(novaMatricula);

        // Adicionar ao Set para evitar duplicatas no mesmo lote
        alunosComMatriculaAtiva.add(dados.UsuarioCPF);

        resultados.push({
          item: dados,
          sucesso: true,
          mensagem: 'Matrícula criada com sucesso',
          dados: this.toDTO(novaMatricula),
          tipo: 'criado'
        });
        criados++;

      } catch (erro: any) {
        console.error('Erro ao processar matrícula:', erro);
        resultados.push({
          item: dados,
          sucesso: false,
          mensagem: erro.message || 'Erro ao processar matrícula',
          tipo: 'erro'
        });
        erros++;
      }
    }

    return {
      totalProcessados: matriculas.length,
      criados,
      existentes,
      erros,
      resultados
    };
  }
}
