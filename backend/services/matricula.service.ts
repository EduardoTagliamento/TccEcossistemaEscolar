import Matricula from "../entities/matricula.model";
import { MatriculaDAO, MatriculaFilters } from "../repositories/matricula.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import EscolaxUsuarioxFuncao from "../entities/escolaxusuarioxfuncao.model";
import MysqlDatabase from "../database/MysqlDatabase";
import ErrorResponse from "../utils/ErrorResponse";
import { gerarGUID } from "../utils/helpers/guid.helper";
import ConversaGrupoService from "./conversa-grupo.service";
import { getNotificacaoService } from "./notificacao.service";
import { getAuditoriaService } from "./auditoria.service";
import { TarefaAcademicaDAO } from "../repositories/tarefaacademica.repository";
import { TarefaAcademicaMatriculaDAO } from "../repositories/tarefaacademica-matricula.repository";
import TarefaAcademicaMatricula from "../entities/tarefaacademica-matricula.model";

/**
 * DTOs para transferência de dados
 */
export interface MatriculaDTO {
  MatriculaGUID: string;
  UsuarioGUID: string;
  TurmaGUID: string | null;
  /** Preenchido só em matrículas-sombra de grupo eletivo (ver docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md) */
  GrupoEletivoGUID: string | null;
  MatriculaDataEntrada: Date;
  MatriculaDataSaida: Date | null;
  MatriculaStatus: 'Ativa' | 'Transferida' | 'Concluida' | 'Cancelada';
  MatriculaCreatedAt: Date;
  MatriculaUpdatedAt: Date;
}

export interface MatriculaCreateDTO {
  MatriculaGUID?: string; // Opcional: RA customizado OU gera UUID
  /** Preenchido quando o cliente já resolveu o aluno via busca por nome. */
  UsuarioGUID?: string;
  /** Opcional — CPF deixou de ser obrigatório/identificador de busca. Ainda
   *  serve como caminho de resolução quando fornecido (compatibilidade). */
  UsuarioCPF?: string;
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
  #conversaGrupoService?: ConversaGrupoService;
  #tarefaDAO?: TarefaAcademicaDAO;
  #tarefaMatriculaDAO?: TarefaAcademicaMatriculaDAO;

  constructor(
    matriculaDAO: MatriculaDAO,
    turmaDAO: TurmaDAO,
    usuarioDAO: UsuarioDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO,
    database: MysqlDatabase,
    conversaGrupoService?: ConversaGrupoService,
    tarefaDAO?: TarefaAcademicaDAO,
    tarefaMatriculaDAO?: TarefaAcademicaMatriculaDAO
  ) {
    this.#matriculaDAO = matriculaDAO;
    this.#turmaDAO = turmaDAO;
    this.#usuarioDAO = usuarioDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
    this.#database = database;
    this.#conversaGrupoService = conversaGrupoService;
    this.#tarefaDAO = tarefaDAO;
    this.#tarefaMatriculaDAO = tarefaMatriculaDAO;
  }

  /**
   * Atribui ao aluno recém-matriculado as tarefas individuais (não em grupo)
   * já existentes na turma com prazo futuro — sem isso, quem entra na turma
   * depois de uma tarefa criada nunca a vê (a atribuição é decidida na
   * criação da tarefa, via lista fixa de matrículas). Tarefas em grupo ficam
   * de fora (entrar num grupo já formado não é uma decisão automática) e
   * tarefas com prazo vencido também (não faz sentido cobrar uma entrega que
   * já fechou).
   */
  #atribuirTarefasExistentes = async (matriculaGUID: string, turmaGUID: string): Promise<void> => {
    if (!this.#tarefaDAO || !this.#tarefaMatriculaDAO) return;

    try {
      const tarefas = await this.#tarefaDAO.findIndividuaisAtivasPorTurma(turmaGUID);
      if (tarefas.length === 0) return;

      const atribuicoes = tarefas.map((tarefa) => {
        const atrib = new TarefaAcademicaMatricula();
        atrib.TarefaMatriculaGUID = gerarGUID();
        atrib.TarefaGUID = tarefa.TarefaGUID;
        atrib.MatriculaGUID = matriculaGUID;
        atrib.TarefaPrazoDataMatricula = null;
        atrib.TarefaFeito = false;
        atrib.TarefaRealizacaoData = null;
        return atrib;
      });

      await this.#tarefaMatriculaDAO.createBatch(atribuicoes);
    } catch (error) {
      console.error("🔴 MatriculaService.#atribuirTarefasExistentes() falhou:", error);
    }
  };

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
  async criarMatricula(data: MatriculaCreateDTO, usuarioGUIDAtor: string): Promise<MatriculaDTO> {
    // 1. Validar que turma existe
    if (!data.TurmaGUID) {
      throw new ErrorResponse(400, 'TurmaGUID é obrigatório', {
        message: 'O campo TurmaGUID é obrigatório para criar uma matrícula',
      });
    }
    const turma = await this.#turmaDAO.findById(data.TurmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: `Não existe turma com id ${data.TurmaGUID}`,
      });
    }

    // 2. Validar permissão de escrita
    if (!turma.EscolaGUID) {
      throw new ErrorResponse(500, 'Turma sem EscolaGUID', {
        message: 'A turma não possui EscolaGUID associado',
      });
    }
    await this.validarPermissaoEscrita(usuarioGUIDAtor, turma.EscolaGUID);

    // 3. Validar que usuário (aluno) existe — GUID (já resolvido pelo
    // cliente via busca por nome) tem prioridade sobre CPF, que agora é
    // opcional (ver docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md).
    if (!data.UsuarioGUID && !data.UsuarioCPF) {
      throw new ErrorResponse(400, 'Aluno não informado', {
        message: 'É necessário informar UsuarioGUID ou UsuarioCPF do aluno',
      });
    }
    const usuario = data.UsuarioGUID
      ? await this.#usuarioDAO.findByGUID(data.UsuarioGUID)
      : await this.#usuarioDAO.findByCPF(data.UsuarioCPF!);
    if (!usuario) {
      throw new ErrorResponse(404, 'Usuário não encontrado', {
        message: data.UsuarioGUID
          ? `Não existe usuário com o identificador informado`
          : `Não existe usuário com CPF ${data.UsuarioCPF}`,
      });
    }

    // 4. Validar se aluno já possui matrícula ativa NESTA escola — cada
    // escola é um tenant independente, então uma matrícula ativa noutra
    // escola não deve bloquear (ex.: ensino médio regular + técnico).
    const matriculaAtiva = await this.#matriculaDAO.findMatriculaAtivaByUsuarioEEscola(
      usuario.UsuarioGUID,
      turma.EscolaGUID
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
    const matriculaGUID = data.MatriculaGUID?.trim() || gerarGUID();

    // 6. Criar entidade
    const matricula = new Matricula();
    matricula.MatriculaGUID = matriculaGUID;
    matricula.UsuarioGUID = usuario.UsuarioGUID;
    matricula.TurmaGUID = data.TurmaGUID;
    matricula.MatriculaDataEntrada = data.MatriculaDataEntrada || new Date();
    matricula.MatriculaDataSaida = null;
    matricula.MatriculaStatus = 'Ativa';
    matricula.MatriculaCreatedAt = new Date();
    matricula.MatriculaUpdatedAt = new Date();

    matricula.validar();

    // 7. Persistir
    const matriculaCriada = await this.#matriculaDAO.create(matricula);

    // 7.1 Garantir vínculo de Aluno (FuncaoId=5) na escola — sem isso, o
    // aluno tem matrícula mas nenhuma checagem de "vínculo ativo com a
    // escola" (usada em pendência, aviso, etc.) passa, porque essas
    // checagens olham escolaxusuarioxfuncao, não matricula.
    await this.garantirVinculoAluno(usuario.UsuarioGUID, turma.EscolaGUID);

    // 8. Adicionar ao grupo de conversa da turma
    if (this.#conversaGrupoService) {
      await this.#conversaGrupoService.adicionarMembroTurma(
        matriculaCriada.TurmaGUID!,
        usuario.UsuarioGUID
      );
    }

    // 8.1 Atribuir tarefas individuais já existentes na turma (com prazo
    // futuro) — sem isso, quem entra depois nunca vê tarefas criadas antes.
    await this.#atribuirTarefasExistentes(matriculaCriada.MatriculaGUID, matriculaCriada.TurmaGUID!);

    // 9. Notificar o aluno (tipo `matricula_nova_turma`) — não bloqueia a resposta
    getNotificacaoService().disparar({
      tipoSlug: "matricula_nova_turma",
      destinatarios: [usuario.UsuarioGUID],
      escolaGUID: turma.EscolaGUID,
      titulo: `Você foi matriculado(a) na turma ${turma.TurmaSerie} ${turma.TurmaNome}`,
      entidadeTipo: "turma",
      entidadeGUID: turma.TurmaGUID,
      link: `/dashboard/${turma.EscolaGUID}/materias`,
    }).catch((error) => {
      console.error("🔴 MatriculaService.criarMatricula() - notificação falhou:", error);
    });

    void getAuditoriaService().registrar({
      EscolaGUID: turma.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
      AcaoTipo: "Create",
      EntidadeTipo: "matricula",
      EntidadeGUID: matriculaCriada.MatriculaGUID,
      EntidadeDescricao: `Matrícula de ${matriculaCriada.UsuarioGUID} na turma ${turma.TurmaSerie} ${turma.TurmaNome}`,
      CategoriaAuditoriaId: 3, // DadosPessoais
    });

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
  async transferirAluno(data: TransferenciaDTO, usuarioGUIDAtor: string): Promise<{
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
      await this.validarPermissaoEscrita(usuarioGUIDAtor, turmaOrigem.EscolaGUID);

      // 3b. Resolver aluno por CPF (input) -> UsuarioGUID (identidade real)
      const aluno = await this.#usuarioDAO.findByCPF(data.UsuarioCPF);
      if (!aluno) {
        throw new ErrorResponse(404, 'Usuário não encontrado', {
          message: `Não existe usuário com CPF ${data.UsuarioCPF}`,
        });
      }

      // 4. Buscar matrícula ativa na turma origem
      const queryBuscar = `
        SELECT * FROM matricula
        WHERE UsuarioGUID = ?
          AND TurmaGUID = ?
          AND MatriculaStatus = 'Ativa'
        LIMIT 1
      `;

      const [rows] = await connection.execute(queryBuscar, [
        aluno.UsuarioGUID,
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
      novaMatricula.MatriculaGUID = gerarGUID(); // Sempre gera novo UUID na transferência
      novaMatricula.UsuarioGUID = aluno.UsuarioGUID;
      novaMatricula.TurmaGUID = data.TurmaDestinoGUID;
      novaMatricula.MatriculaDataEntrada = data.DataTransferencia;
      novaMatricula.MatriculaDataSaida = null;
      novaMatricula.MatriculaStatus = 'Ativa';
      novaMatricula.MatriculaCreatedAt = new Date();
      novaMatricula.MatriculaUpdatedAt = new Date();

      const queryInserir = `
        INSERT INTO matricula
        (MatriculaGUID, UsuarioGUID, TurmaGUID, MatriculaDataEntrada,
         MatriculaDataSaida, MatriculaStatus, MatriculaCreatedAt, MatriculaUpdatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(queryInserir, [
        novaMatricula.MatriculaGUID,
        novaMatricula.UsuarioGUID,
        novaMatricula.TurmaGUID,
        novaMatricula.MatriculaDataEntrada,
        novaMatricula.MatriculaDataSaida,
        novaMatricula.MatriculaStatus,
        novaMatricula.MatriculaCreatedAt,
        novaMatricula.MatriculaUpdatedAt,
      ]);

      // COMMIT
      await connection.commit();

      // Garantir vínculo de Aluno (FuncaoId=5) na escola de DESTINO — uma
      // transferência pode ser entre escolas diferentes; sem isso o aluno
      // fica sem acesso na escola nova mesmo com a matrícula criada.
      await this.garantirVinculoAluno(aluno.UsuarioGUID, turmaDestino.EscolaGUID);

      // Mover no grupo de conversa: sai do grupo da turma de origem, entra
      // no grupo da turma de destino — transferirAluno nunca fazia isso.
      if (this.#conversaGrupoService) {
        await this.#conversaGrupoService.removerMembroTurma(turmaOrigem.TurmaGUID, aluno.UsuarioGUID);
        await this.#conversaGrupoService.adicionarMembroTurma(turmaDestino.TurmaGUID, aluno.UsuarioGUID);
      }

      // Atribuir tarefas individuais já existentes na turma de destino —
      // mesmo motivo do fluxo individual (ver criarMatricula).
      await this.#atribuirTarefasExistentes(novaMatricula.MatriculaGUID, turmaDestino.TurmaGUID);

      void getAuditoriaService().registrar({
        EscolaGUID: turmaOrigem.EscolaGUID,
        UsuarioGUIDAtor: usuarioGUIDAtor,
        AcaoTipo: "Update",
        EntidadeTipo: "matricula",
        EntidadeGUID: matriculaOrigem.MatriculaGUID,
        EntidadeDescricao: `Transferência: matrícula encerrada na turma ${turmaOrigem.TurmaSerie} ${turmaOrigem.TurmaNome}`,
        CategoriaAuditoriaId: 3, // DadosPessoais
      });
      void getAuditoriaService().registrar({
        EscolaGUID: turmaDestino.EscolaGUID,
        UsuarioGUIDAtor: usuarioGUIDAtor,
        AcaoTipo: "Create",
        EntidadeTipo: "matricula",
        EntidadeGUID: novaMatricula.MatriculaGUID,
        EntidadeDescricao: `Transferência: nova matrícula na turma ${turmaDestino.TurmaSerie} ${turmaDestino.TurmaNome}`,
        CategoriaAuditoriaId: 3, // DadosPessoais
      });

      // Retornar dados das duas matrículas
      return {
        matriculaAnterior: {
          MatriculaGUID: matriculaOrigem.MatriculaGUID,
          UsuarioGUID: matriculaOrigem.UsuarioGUID,
          TurmaGUID: matriculaOrigem.TurmaGUID,
          GrupoEletivoGUID: null,
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
    usuarioGUIDAtor: string
  ): Promise<MatriculaDTO> {
    // 1. Buscar matrícula
    const matriculaExistente = await this.#matriculaDAO.findById(matriculaGUID);
    if (!matriculaExistente) {
      throw new ErrorResponse(404, 'Matrícula não encontrada', {
        message: `Não existe matrícula com id ${matriculaGUID}`,
      });
    }

    // 1.1 Matrícula-sombra de grupo eletivo não é gerida por aqui — ver
    // GrupoEletivoService.removerMembro (docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md, §2)
    if (matriculaExistente.GrupoEletivoGUID) {
      throw new ErrorResponse(400, 'Matrícula de grupo eletivo', {
        message: 'Esta matrícula pertence a um grupo eletivo — gerencie pelos endpoints de /api/grupoeletivo.',
      });
    }

    // 2. Buscar turma para validar permissão
    const turma = await this.#turmaDAO.findById(matriculaExistente.TurmaGUID!);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: 'Turma vinculada não existe',
      });
    }

    // 3. Validar permissão
    await this.validarPermissaoEscrita(usuarioGUIDAtor, turma.EscolaGUID);

    // 4. Atualizar
    const matriculaAtualizada = await this.#matriculaDAO.update(matriculaGUID, data);

    if (!matriculaAtualizada) {
      throw new ErrorResponse(500, 'Erro ao atualizar matrícula', {
        message: 'Não foi possível atualizar a matrícula',
      });
    }

    // 5. Remover do grupo de conversa se saiu da turma
    const statusSaida: MatriculaDTO['MatriculaStatus'][] = ['Transferida', 'Cancelada', 'Concluida'];
    if (
      this.#conversaGrupoService &&
      data.MatriculaStatus &&
      statusSaida.includes(data.MatriculaStatus)
    ) {
      await this.#conversaGrupoService.removerMembroTurma(
        matriculaAtualizada.TurmaGUID!,
        matriculaAtualizada.UsuarioGUID
      );
    }

    void getAuditoriaService().registrar({
      EscolaGUID: turma.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
      AcaoTipo: "Update",
      EntidadeTipo: "matricula",
      EntidadeGUID: matriculaAtualizada.MatriculaGUID,
      CategoriaAuditoriaId: 3, // DadosPessoais
    });

    return this.toDTO(matriculaAtualizada);
  }

  /**
   * Excluir matrícula (cancela)
   */
  async excluirMatricula(matriculaGUID: string, usuarioGUIDAtor: string): Promise<void> {
    // 1. Buscar matrícula
    const matricula = await this.#matriculaDAO.findById(matriculaGUID);
    if (!matricula) {
      throw new ErrorResponse(404, 'Matrícula não encontrada', {
        message: `Não existe matrícula com id ${matriculaGUID}`,
      });
    }

    // 1.1 Matrícula-sombra de grupo eletivo não é gerida por aqui — ver
    // GrupoEletivoService.removerMembro (docs/PLANO_IMPLEMENTACAO_GRUPO_ELETIVO.md, §2)
    if (matricula.GrupoEletivoGUID) {
      throw new ErrorResponse(400, 'Matrícula de grupo eletivo', {
        message: 'Esta matrícula pertence a um grupo eletivo — gerencie pelos endpoints de /api/grupoeletivo.',
      });
    }

    // 2. Buscar turma para validar permissão
    const turma = await this.#turmaDAO.findById(matricula.TurmaGUID!);
    if (!turma) {
      throw new ErrorResponse(404, 'Turma não encontrada', {
        message: 'Turma vinculada não existe',
      });
    }

    // 3. Validar permissão
    await this.validarPermissaoEscrita(usuarioGUIDAtor, turma.EscolaGUID);

    // 4. Cancelar
    const deletado = await this.#matriculaDAO.delete(matriculaGUID);

    if (!deletado) {
      throw new ErrorResponse(500, 'Erro ao cancelar matrícula', {
        message: 'Não foi possível cancelar a matrícula',
      });
    }

    // 5. Remover do grupo de conversa da turma
    if (this.#conversaGrupoService) {
      await this.#conversaGrupoService.removerMembroTurma(
        matricula.TurmaGUID!,
        matricula.UsuarioGUID
      );
    }

    void getAuditoriaService().registrar({
      EscolaGUID: turma.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
      AcaoTipo: "Delete",
      EntidadeTipo: "matricula",
      EntidadeGUID: matricula.MatriculaGUID,
      CategoriaAuditoriaId: 3, // DadosPessoais
    });
  }

  /**
   * Garante um vínculo Ativo de Aluno (FuncaoId=5) do usuário na escola —
   * cria se não existir, reativa se existir mas estiver Inativo/Finalizado
   * (ex.: aluno que já teve vínculo antigo com essa escola). Idempotente:
   * não faz nada se já estiver Ativo.
   */
  private async garantirVinculoAluno(usuarioGUID: string, escolaGUID: string): Promise<void> {
    const existente = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(usuarioGUID, escolaGUID, 5);

    if (!existente) {
      const vinculo = new EscolaxUsuarioxFuncao();
      vinculo.UsuarioGUID = usuarioGUID;
      vinculo.EscolaGUID = escolaGUID;
      vinculo.FuncaoId = 5;
      vinculo.DataInicio = new Date();
      vinculo.DataFim = null;
      vinculo.Status = 'Ativo';
      await this.#escolaxUsuarioxFuncaoDAO.create(vinculo);
      return;
    }

    if (existente.Status !== 'Ativo') {
      existente.Status = 'Ativo';
      existente.DataInicio = new Date();
      existente.DataFim = null;
      await this.#escolaxUsuarioxFuncaoDAO.update(existente);
    }
  }

  /**
   * Valida se usuário tem permissão de escrita na escola
   * (FuncaoId 1 = Coordenação ou FuncaoId 6 = Direção)
   */
  private async validarPermissaoEscrita(
    usuarioGUID: string,
    escolaGUID: string
  ): Promise<void> {
    // Validar Coordenação (FuncaoId = 1)
    const coordenacao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(
      usuarioGUID,
      escolaGUID,
      1
    );

    if (coordenacao && coordenacao.Status === 'Ativo') {
      return; // Tem permissão
    }

    // Validar Direção (FuncaoId = 6)
    const direcao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(
      usuarioGUID,
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
      UsuarioGUID: matricula.UsuarioGUID,
      TurmaGUID: matricula.TurmaGUID,
      GrupoEletivoGUID: matricula.GrupoEletivoGUID,
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
   * @param usuarioGUIDAtor - UsuarioGUID de quem está criando (autor, p/ auditoria)
   * @returns BatchMatriculaCreateResponse com resultados detalhados
   */
  async criarMatriculasEmMassa(
    matriculas: MatriculaCreateDTO[],
    escolaGUID: string,
    usuarioGUIDAtor: string
  ): Promise<BatchMatriculaCreateResponse> {
    // 1. Validar permissão uma única vez
    await this.validarPermissaoEscrita(usuarioGUIDAtor, escolaGUID);

    // 2. Buscar todas as turmas da escola (para resolução de nomes)
    const turmasDaEscola = await this.#turmaDAO.findAll({ EscolaGUID: escolaGUID });

    // Criar mapa: nome → GUID (case-insensitive)
    const mapaTurmaNomeParaGUID = new Map<string, string>();
    for (const turma of turmasDaEscola) {
      const chave = `${turma.TurmaSerie.toLowerCase()}|${turma.TurmaNome.toLowerCase()}`;
      mapaTurmaNomeParaGUID.set(chave, turma.TurmaGUID);
    }

    // 3. Buscar matrículas ativas existentes NESTA escola (para detecção de
    // duplicatas) — matrícula ativa noutra escola não conta como duplicata.
    const matriculasAtivas = await this.#matriculaDAO.findAll({
      MatriculaStatus: 'Ativa',
      EscolaGUID: escolaGUID
    });

    // Criar Set de alunos com matrícula ativa (por UsuarioGUID)
    const alunosComMatriculaAtiva = new Set(
      matriculasAtivas.map(m => m.UsuarioGUID)
    );

    // 4. Processar cada matrícula
    const resultados: BatchMatriculaItemResult[] = [];
    let criados = 0;
    let existentes = 0;
    let erros = 0;

    for (const dados of matriculas) {
      try {
        let turmaGUID: string | undefined;

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
        if (!turmaGUID) {
          resultados.push({
            item: dados,
            sucesso: false,
            mensagem: 'Erro ao resolver TurmaGUID',
            tipo: 'erro'
          });
          erros++;
          continue;
        }
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

        // Resolver aluno — GUID (já resolvido no passo anterior de criação/
        // vínculo do usuário) tem prioridade sobre CPF, que é opcional.
        if (!dados.UsuarioGUID && !dados.UsuarioCPF) {
          resultados.push({
            item: dados,
            sucesso: false,
            mensagem: 'Aluno não informado (UsuarioGUID ou UsuarioCPF)',
            tipo: 'erro'
          });
          erros++;
          continue;
        }
        const aluno = dados.UsuarioGUID
          ? await this.#usuarioDAO.findByGUID(dados.UsuarioGUID)
          : await this.#usuarioDAO.findByCPF(dados.UsuarioCPF!);
        if (!aluno) {
          resultados.push({
            item: dados,
            sucesso: false,
            mensagem: dados.UsuarioGUID
              ? 'Nenhum usuário cadastrado com o identificador informado'
              : `Nenhum usuário cadastrado com o CPF ${dados.UsuarioCPF}`,
            tipo: 'erro'
          });
          erros++;
          continue;
        }

        // Verificar se aluno já tem matrícula ativa
        if (alunosComMatriculaAtiva.has(aluno.UsuarioGUID)) {
          // Buscar matrícula ativa do aluno
          const matriculaAtiva = matriculasAtivas.find(m => m.UsuarioGUID === aluno.UsuarioGUID);

          // Backfill: aluno com matrícula de antes deste fix pode não ter
          // o vínculo de Aluno (FuncaoId=5) — garante mesmo no caminho
          // "já existe", idempotente.
          await this.garantirVinculoAluno(aluno.UsuarioGUID, escolaGUID);

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
        novaMatricula.MatriculaGUID = dados.MatriculaGUID || gerarGUID();
        novaMatricula.UsuarioGUID = aluno.UsuarioGUID;
        novaMatricula.TurmaGUID = turmaGUID;
        novaMatricula.MatriculaDataEntrada = dados.MatriculaDataEntrada || new Date();
        novaMatricula.MatriculaDataSaida = null;
        novaMatricula.MatriculaStatus = 'Ativa';
        novaMatricula.MatriculaCreatedAt = new Date();
        novaMatricula.MatriculaUpdatedAt = new Date();

        await this.#matriculaDAO.create(novaMatricula);

        // Garantir vínculo de Aluno (FuncaoId=5) — mesmo motivo do fluxo
        // individual (ver criarMatricula): sem isso, checagens de "vínculo
        // ativo com a escola" (pendência, aviso, etc.) bloqueiam o aluno.
        await this.garantirVinculoAluno(aluno.UsuarioGUID, escolaGUID);

        // Adicionar ao grupo de conversa da turma — mesmo motivo do fluxo
        // individual (ver criarMatricula); em massa nunca fazia isso.
        if (this.#conversaGrupoService) {
          await this.#conversaGrupoService.adicionarMembroTurma(turmaGUID, aluno.UsuarioGUID);
        }

        // Atribuir tarefas individuais já existentes na turma — mesmo motivo
        // do fluxo individual (ver criarMatricula).
        await this.#atribuirTarefasExistentes(novaMatricula.MatriculaGUID, turmaGUID);

        void getAuditoriaService().registrar({
          EscolaGUID: escolaGUID,
          UsuarioGUIDAtor: usuarioGUIDAtor,
          AcaoTipo: "Create",
          EntidadeTipo: "matricula",
          EntidadeGUID: novaMatricula.MatriculaGUID,
          EntidadeDescricao: `Matrícula em massa: ${novaMatricula.UsuarioGUID} na turma ${turma.TurmaSerie} ${turma.TurmaNome}`,
          CategoriaAuditoriaId: 3, // DadosPessoais
        });

        // Adicionar ao Set para evitar duplicatas no mesmo lote
        alunosComMatriculaAtiva.add(aluno.UsuarioGUID);

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
