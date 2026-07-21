import { v4 as uuidv4 } from 'uuid';
import { GrupoTarefaDAO } from '../repositories/grupotarefa.repository';
import { UsuarioXGrupoTarefaDAO } from '../repositories/usuarioxgrupotarefa.repository';
import { TarefaAcademicaDAO } from '../repositories/tarefaacademica.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';
import { TarefaAcademicaMatriculaDAO } from '../repositories/tarefaacademica-matricula.repository';
import HistoricoGrupoTarefaService from './historicogrupotarefa.service';
import ConversaGrupoService from './conversa-grupo.service';
import ErrorResponse from '../utils/ErrorResponse';
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket } from 'mysql2';
import { pool as mysqlPool } from '../database/mysql';
import { getNotificacaoService } from './notificacao.service';
import { getAuditoriaService } from './auditoria.service';
import {
  GrupoTarefaComMembrosDTO,
  GrupoTarefaCreateDTO
} from '../entities/grupotarefa.model';

export default class GrupoTarefaService {
  #grupoTarefaDAO: GrupoTarefaDAO;
  #usuarioXGrupoDAO: UsuarioXGrupoTarefaDAO;
  #tarefaDAO: TarefaAcademicaDAO;
  #matriculaDAO: MatriculaDAO;
  #tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO;
  #historicoService: HistoricoGrupoTarefaService;
  #database: MysqlDatabase;
  #conversaGrupoService?: ConversaGrupoService;

  constructor(
    grupoTarefaDAO: GrupoTarefaDAO,
    usuarioXGrupoDAO: UsuarioXGrupoTarefaDAO,
    tarefaDAO: TarefaAcademicaDAO,
    matriculaDAO: MatriculaDAO,
    tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO,
    historicoService: HistoricoGrupoTarefaService,
    database: MysqlDatabase,
    conversaGrupoService?: ConversaGrupoService
  ) {
    console.log('⬆️  GrupoTarefaService.constructor()');
    this.#grupoTarefaDAO = grupoTarefaDAO;
    this.#usuarioXGrupoDAO = usuarioXGrupoDAO;
    this.#tarefaDAO = tarefaDAO;
    this.#matriculaDAO = matriculaDAO;
    this.#tarefaMatriculaDAO = tarefaMatriculaDAO;
    this.#historicoService = historicoService;
    this.#database = database;
    this.#conversaGrupoService = conversaGrupoService;
  }

  /**
   * CRIAR GRUPOS AUTOMATICAMENTE ao criar tarefa compartilhada
   * Chamado por TarefaAcademicaService.criarTarefa()
   * 
   * @returns Quantidade de grupos criados
   */
  async criarGruposAutomaticos(tarefaGUID: string, turmasGUID: string[]): Promise<number> {
    console.log('🟣 GrupoTarefaService.criarGruposAutomaticos()');

    // 1. Validar tarefa
    const tarefa = await this.#tarefaDAO.findById(tarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, 'Tarefa não encontrada');
    }

    if (!tarefa.TarefaCompartilhada) {
      throw new ErrorResponse(400, 'Tarefa não é compartilhada');
    }

    let gruposCriados = 0;

    // 2. Para cada turma, criar grupos para todos os alunos matriculados
    for (const turmaGUID of turmasGUID) {
      const matriculas = await this.#matriculaDAO.findByTurma(turmaGUID);

      for (const matricula of matriculas) {
        try {
          // Criar grupo com aluno como líder
          const grupoData: GrupoTarefaCreateDTO = {
            TarefaGUID: tarefaGUID,
            TurmaGUID: turmaGUID,
            UsuarioCPFLider: matricula.UsuarioCPF,
            GrupoNome: undefined  // Será gerado automaticamente no frontend
          };

          const novoGrupo = await this.#grupoTarefaDAO.create(grupoData);
          gruposCriados++;
          if (this.#conversaGrupoService) {
            await this.#conversaGrupoService.criarConversaParaGrupoTarefa(
              novoGrupo.GrupoTarefaGUID,
              tarefa.TarefaTitulo,
              matricula.UsuarioCPF
            );
          }
        } catch (error: any) {
          console.error(`Erro ao criar grupo para ${matricula.UsuarioCPF}:`, error.message);
          // Continuar criando outros grupos mesmo se um falhar
        }
      }
    }

    return gruposCriados;
  }

  /**
   * LISTAR GRUPOS de uma tarefa
   */
  async listarGruposDaTarefa(tarefaGUID: string, usuarioCPF: string): Promise<GrupoTarefaComMembrosDTO[]> {
    console.log('🟣 GrupoTarefaService.listarGruposDaTarefa()');

    // 1. Validar acesso do usuário à tarefa
    const tarefa = await this.#tarefaDAO.findById(tarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, 'Tarefa não encontrada');
    }

    // 2. Buscar grupos
    const grupos = await this.#grupoTarefaDAO.findAll({ TarefaGUID: tarefaGUID });

    // 3. Buscar detalhes de cada grupo (com membros)
    const gruposDetalhados: GrupoTarefaComMembrosDTO[] = [];
    
    for (const grupo of grupos) {
      const grupoComMembros = await this.#grupoTarefaDAO.findByIdComMembros(grupo.GrupoTarefaGUID);
      if (grupoComMembros) {
        gruposDetalhados.push(grupoComMembros);
      }
    }

    return gruposDetalhados;
  }

  /**
   * BUSCAR GRUPO ESPECÍFICO (com membros)
   */
  async buscarGrupo(grupoGUID: string, usuarioCPF: string): Promise<GrupoTarefaComMembrosDTO> {
    console.log('🟣 GrupoTarefaService.buscarGrupo()');

    const grupo = await this.#grupoTarefaDAO.findByIdComMembros(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    // Validar se usuário tem acesso ao grupo (é membro ou líder)
    const temAcesso = await this.#grupoTarefaDAO.usuarioPertenceAoGrupo(usuarioCPF, grupoGUID);
    if (!temAcesso) {
      throw new ErrorResponse(403, 'Você não tem acesso a este grupo');
    }

    return grupo;
  }

  /**
   * EXPULSAR MEMBRO do grupo
   * Apenas líder pode expulsar
   * Membro expulso recebe grupo próprio novamente
   */
  async expulsarMembro(
    grupoGUID: string,
    membroCPF: string,
    liderCPF: string
  ): Promise<{ mensagem: string; novoGrupoGUID: string }> {
    console.log('🟣 GrupoTarefaService.expulsarMembro()');

    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Validar grupo
      const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
      if (!grupo) {
        throw new ErrorResponse(404, 'Grupo não encontrado');
      }

      // 2. Validar se quem expulsa é o líder
      if (grupo.UsuarioCPFLider !== liderCPF) {
        throw new ErrorResponse(403, 'Apenas o líder pode expulsar membros');
      }

      // 3. Validar se membro a ser expulso não é o líder
      if (membroCPF === liderCPF) {
        throw new ErrorResponse(400, 'Líder não pode expulsar a si mesmo');
      }

      // 4. Validar se membro realmente pertence ao grupo
      const isMembro = await this.#usuarioXGrupoDAO.isMembroNaoLider(membroCPF, grupoGUID);
      if (!isMembro) {
        throw new ErrorResponse(404, 'Usuário não é membro deste grupo');
      }

      // 5. Remover membro do grupo
      await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, membroCPF);

      // 6. Criar novo grupo para o membro expulso (ele vira líder do próprio grupo)
      const novoGrupoData: GrupoTarefaCreateDTO = {
        TarefaGUID: grupo.TarefaGUID,
        TurmaGUID: grupo.TurmaGUID,
        UsuarioCPFLider: membroCPF,
        GrupoNome: undefined
      };

      const novoGrupo = await this.#grupoTarefaDAO.create(novoGrupoData);

      // 6a. Hooks de conversa
      if (this.#conversaGrupoService) {
        await this.#conversaGrupoService.removerMembroGrupoTarefa(grupoGUID, membroCPF);
        const tarefa = await this.#tarefaDAO.findById(grupo.TarefaGUID);
        await this.#conversaGrupoService.criarConversaParaGrupoTarefa(
          novoGrupo.GrupoTarefaGUID,
          tarefa?.TarefaTitulo ?? 'Grupo',
          membroCPF
        );
      }

      // 7. Registrar no histórico
      await this.#historicoService.registrar({
        GrupoTarefaGUID: grupoGUID,
        HistoricoTipo: 'Expulsao',
        UsuarioCPFAtor: liderCPF,
        UsuarioCPFAlvo: membroCPF,
        HistoricoDetalhes: {
          novoGrupoGUID: novoGrupo.GrupoTarefaGUID
        }
      });

      await connection.commit();

      this.#notificarRemovidoGrupo(grupo.TurmaGUID, grupo.TarefaGUID, membroCPF).catch((error) => {
        console.error('🔴 GrupoTarefaService.#notificarRemovidoGrupo() falhou:', error);
      });

      this.#registrarAuditoriaGrupo(grupo.TurmaGUID, grupoGUID, 'Update', liderCPF, `Membro ${membroCPF} expulso do grupo`).catch((error) => {
        console.error('🔴 GrupoTarefaService.#registrarAuditoriaGrupo() falhou:', error);
      });

      return {
        mensagem: 'Membro expulso com sucesso',
        novoGrupoGUID: novoGrupo.GrupoTarefaGUID
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Resolve o EscolaGUID a partir da turma — GrupoTarefa só guarda
   * TurmaGUID, não EscolaGUID diretamente. Usado pelos hooks de auditoria
   * (registroauditoria exige EscolaGUID). Mesmo padrão de JOIN já usado em
   * #notificarRemovidoGrupo/#notificarConviteGrupo.
   */
  #resolverEscolaGUID = async (turmaGUID: string): Promise<string | null> => {
    const [rows] = await mysqlPool.execute<RowDataPacket[]>(
      `SELECT EscolaGUID FROM turma WHERE TurmaGUID = ? LIMIT 1`,
      [turmaGUID]
    );
    return (rows[0] as any)?.EscolaGUID ?? null;
  };

  /** Registra auditoria (fire-and-forget) pra uma ação sobre um GrupoTarefa. */
  #registrarAuditoriaGrupo = async (
    turmaGUID: string,
    grupoGUID: string,
    acaoTipo: 'Create' | 'Update' | 'Delete',
    usuarioCPFAtor: string,
    entidadeDescricao?: string
  ): Promise<void> => {
    const escolaGUID = await this.#resolverEscolaGUID(turmaGUID);
    if (!escolaGUID) return;
    void getAuditoriaService().registrar({
      EscolaGUID: escolaGUID,
      UsuarioCPFAtor: usuarioCPFAtor,
      AcaoTipo: acaoTipo,
      EntidadeTipo: 'grupotarefa',
      EntidadeGUID: grupoGUID,
      EntidadeDescricao: entidadeDescricao ?? null,
      CategoriaAuditoriaId: 1,
    });
  };

  /** Notifica o membro removido (tipo `removido_grupo`) */
  #notificarRemovidoGrupo = async (turmaGUID: string, tarefaGUID: string, membroCPF: string): Promise<void> => {
    const [rows] = await mysqlPool.execute<RowDataPacket[]>(
      `SELECT t.EscolaGUID, ta.TarefaTitulo
       FROM turma t
       INNER JOIN tarefaacademica ta ON ta.TarefaGUID = ?
       WHERE t.TurmaGUID = ?
       LIMIT 1`,
      [tarefaGUID, turmaGUID]
    );
    const info = rows[0] as any;
    if (!info?.EscolaGUID) return;

    await getNotificacaoService().disparar({
      tipoSlug: 'removido_grupo',
      destinatarios: [membroCPF],
      escolaGUID: info.EscolaGUID,
      titulo: `Você foi removido do grupo da tarefa "${info.TarefaTitulo}"`,
      entidadeTipo: 'tarefa',
      entidadeGUID: tarefaGUID,
    });
  };

  /**
   * TRANSFERIR LIDERANÇA
   * Líder atual designa novo líder
   * Transação: líder vira membro, membro vira líder
   */
  async transferirLideranca(
    grupoGUID: string,
    novoLiderCPF: string,
    liderAtualCPF: string
  ): Promise<{ mensagem: string }> {
    console.log('🟣 GrupoTarefaService.transferirLideranca()');

    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Validar grupo
      const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
      if (!grupo) {
        throw new ErrorResponse(404, 'Grupo não encontrado');
      }

      // 2. Validar se quem transfere é o líder atual
      if (grupo.UsuarioCPFLider !== liderAtualCPF) {
        throw new ErrorResponse(403, 'Apenas o líder pode transferir a liderança');
      }

      // 3. Validar se novo líder é membro do grupo
      const isMembroNaoLider = await this.#usuarioXGrupoDAO.isMembroNaoLider(novoLiderCPF, grupoGUID);
      if (!isMembroNaoLider) {
        throw new ErrorResponse(400, 'Novo líder deve ser um membro do grupo');
      }

      // 4. TRANSAÇÃO:
      //    a) Remover novo líder de usuarioxgrupotarefa
      await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, novoLiderCPF);

      //    b) Adicionar líder antigo em usuarioxgrupotarefa
      await this.#usuarioXGrupoDAO.create({
        GrupoTarefaGUID: grupoGUID,
        UsuarioCPF: liderAtualCPF
      });

      //    c) Atualizar GrupoTarefa.UsuarioCPFLider
      await this.#grupoTarefaDAO.update(grupoGUID, {
        UsuarioCPFLider: novoLiderCPF
      });

      // 4d. Sincronizar funcao na conversa do grupo
      if (this.#conversaGrupoService) {
        await this.#conversaGrupoService.transferirLiderGrupoTarefa(grupoGUID, liderAtualCPF, novoLiderCPF);
      }

      // 5. Registrar no histórico
      await this.#historicoService.registrar({
        GrupoTarefaGUID: grupoGUID,
        HistoricoTipo: 'TransferenciaLider',
        UsuarioCPFAtor: liderAtualCPF,
        UsuarioCPFAlvo: novoLiderCPF
      });

      await connection.commit();

      this.#registrarAuditoriaGrupo(grupo.TurmaGUID, grupoGUID, 'Update', liderAtualCPF, `Liderança transferida para ${novoLiderCPF}`).catch((error) => {
        console.error('🔴 GrupoTarefaService.#registrarAuditoriaGrupo() falhou:', error);
      });

      return {
        mensagem: 'Liderança transferida com sucesso'
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * ATUALIZAR NOME DO GRUPO
   * Apenas líder pode alterar
   */
  async atualizarNomeGrupo(
    grupoGUID: string,
    novoNome: string,
    usuarioCPF: string
  ): Promise<{ mensagem: string }> {
    console.log('🟣 GrupoTarefaService.atualizarNomeGrupo()');

    // 1. Validar grupo
    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    // 2. Validar se usuário é o líder
    if (grupo.UsuarioCPFLider !== usuarioCPF) {
      throw new ErrorResponse(403, 'Apenas o líder pode alterar o nome do grupo');
    }

    // 3. Validar nome (máximo 128 caracteres)
    if (novoNome.length > 128) {
      throw new ErrorResponse(400, 'Nome do grupo não pode exceder 128 caracteres');
    }

    // 4. Atualizar
    await this.#grupoTarefaDAO.update(grupoGUID, { GrupoNome: novoNome.trim() });

    this.#registrarAuditoriaGrupo(grupo.TurmaGUID, grupoGUID, 'Update', usuarioCPF, `Nome do grupo alterado para "${novoNome.trim()}"`).catch((error) => {
      console.error('🔴 GrupoTarefaService.#registrarAuditoriaGrupo() falhou:', error);
    });

    return {
      mensagem: 'Nome do grupo atualizado com sucesso'
    };
  }

  /**
   * AUXILIAR - Validar se usuário está sozinho no grupo
   * (Pré-condição para aceitar convite ou solicitação)
   */
  async usuarioEstaSozinhoNoGrupo(usuarioCPF: string, grupoGUID: string): Promise<boolean> {
    console.log('🟣 GrupoTarefaService.usuarioEstaSozinhoNoGrupo()');

    // 1. Verificar se é líder
    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo || grupo.UsuarioCPFLider !== usuarioCPF) {
      return false;
    }

    // 2. Contar membros além do líder
    const membros = await this.#usuarioXGrupoDAO.findByGrupo(grupoGUID);
    
    // Se tem 0 membros (além do líder), está sozinho
    return membros.length === 0;
  }

  /**
   * AUXILIAR - Buscar grupo onde usuário é líder (por tarefa)
   */
  async buscarGrupoOndeEhLider(usuarioCPF: string, tarefaGUID: string) {
    console.log('🟣 GrupoTarefaService.buscarGrupoOndeEhLider()');
    
    return await this.#grupoTarefaDAO.findGrupoOndeEhLider(usuarioCPF, tarefaGUID);
  }
}
