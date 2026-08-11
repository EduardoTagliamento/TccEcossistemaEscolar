import { ConviteGrupoTarefaDAO } from '../repositories/convitegrupotarefa.repository';
import { GrupoTarefaDAO } from '../repositories/grupotarefa.repository';
import { UsuarioXGrupoTarefaDAO } from '../repositories/usuarioxgrupotarefa.repository';
import HistoricoGrupoTarefaService from './historicogrupotarefa.service';
import ErrorResponse from '../utils/ErrorResponse';
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket } from 'mysql2';
import { pool } from '../database/mysql';
import { getNotificacaoService } from './notificacao.service';
import { getAuditoriaService } from './auditoria.service';
import { UsuarioDAO } from '../repositories/usuario.repository';
import {
  ConviteGrupoTarefa,
  ConviteGrupoTarefaCreateDTO,
  ConviteGrupoTarefaDTO,
  ConviteTipo
} from '../entities/convitegrupotarefa.model';

export default class ConviteGrupoTarefaService {
  #conviteDAO: ConviteGrupoTarefaDAO;
  #grupoTarefaDAO: GrupoTarefaDAO;
  #usuarioXGrupoDAO: UsuarioXGrupoTarefaDAO;
  #historicoService: HistoricoGrupoTarefaService;
  #database: MysqlDatabase;
  #usuarioDAO: UsuarioDAO;

  constructor(
    conviteDAO: ConviteGrupoTarefaDAO,
    grupoTarefaDAO: GrupoTarefaDAO,
    usuarioXGrupoDAO: UsuarioXGrupoTarefaDAO,
    historicoService: HistoricoGrupoTarefaService,
    database: MysqlDatabase,
    usuarioDAO: UsuarioDAO
  ) {
    console.log('⬆️  ConviteGrupoTarefaService.constructor()');
    this.#conviteDAO = conviteDAO;
    this.#grupoTarefaDAO = grupoTarefaDAO;
    this.#usuarioXGrupoDAO = usuarioXGrupoDAO;
    this.#historicoService = historicoService;
    this.#database = database;
    this.#usuarioDAO = usuarioDAO;
  }

  /**
   * LÍDER ENVIA CONVITE para aluno
   * Validações: líder deve ser do grupo, grupo não pode estar cheio
   */
  async enviarConvite(
    grupoGUID: string,
    convidadoCPF: string,
    liderGUID: string
  ): Promise<ConviteGrupoTarefa> {
    console.log('🟣 ConviteGrupoTarefaService.enviarConvite()');

    // grupotarefa ainda usa CPF — resolver o líder (ator) a partir do
    // UsuarioGUID.
    const liderUsuario = await this.#usuarioDAO.findByGUID(liderGUID);
    if (!liderUsuario?.UsuarioCPF) {
      throw new ErrorResponse(403, 'Apenas o líder pode enviar convites');
    }
    const liderCPF = liderUsuario.UsuarioCPF;

    // 1. Validar grupo
    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    // 2. Validar se quem envia é o líder
    if (grupo.UsuarioCPFLider !== liderCPF) {
      throw new ErrorResponse(403, 'Apenas o líder pode enviar convites');
    }

    // 3. Validar se grupo não está cheio
    const totalMembros = await this.#grupoTarefaDAO.contarMembros(grupoGUID);
    // Buscar limite da tarefa (precisaria buscar a tarefa, simplificando aqui)
    // TODO: Validar limite máximo

    // 4. Verificar se já existe convite pendente
    const existeConvite = await this.#conviteDAO.existeConvitePendente(grupoGUID, convidadoCPF);
    if (existeConvite) {
      throw new ErrorResponse(409, 'Já existe um convite pendente para este usuário');
    }

    // 5. Verificar se convidado já está no grupo
    const jaEstaNoGrupo = await this.#grupoTarefaDAO.usuarioPertenceAoGrupo(convidadoCPF, grupoGUID);
    if (jaEstaNoGrupo) {
      throw new ErrorResponse(400, 'Usuário já é membro do grupo');
    }

    // 6. Criar convite
    const conviteData: ConviteGrupoTarefaCreateDTO = {
      GrupoTarefaGUID: grupoGUID,
      UsuarioCPFConvidado: convidadoCPF,
      ConviteTipo: 'Convite'
    };

    const convite = await this.#conviteDAO.create(conviteData);

    this.#notificarConviteGrupo(grupo.TurmaGUID, grupo.TarefaGUID, liderCPF, convidadoCPF).catch((error) => {
      console.error('🔴 ConviteGrupoTarefaService.#notificarConviteGrupo() falhou:', error);
    });

    this.#registrarAuditoriaConvite(grupo.TurmaGUID, convite.ConviteGUID, 'Create', liderCPF, `Convite enviado a ${convidadoCPF}`).catch((error) => {
      console.error('🔴 ConviteGrupoTarefaService.#registrarAuditoriaConvite() falhou:', error);
    });

    return convite;
  }

  /**
   * Resolve o EscolaGUID a partir da turma (mesma necessidade/padrão de
   * GrupoTarefaService.#resolverEscolaGUID) — usado pelos hooks de auditoria.
   */
  #resolverEscolaGUID = async (turmaGUID: string): Promise<string | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT EscolaGUID FROM turma WHERE TurmaGUID = ? LIMIT 1`,
      [turmaGUID]
    );
    return (rows[0] as any)?.EscolaGUID ?? null;
  };

  /** Registra auditoria (fire-and-forget) pra uma ação sobre um ConviteGrupoTarefa. */
  #registrarAuditoriaConvite = async (
    turmaGUID: string,
    conviteGUID: string,
    acaoTipo: 'Create' | 'Update' | 'Delete',
    usuarioCPFAtor: string,
    entidadeDescricao?: string
  ): Promise<void> => {
    const escolaGUID = await this.#resolverEscolaGUID(turmaGUID);
    if (!escolaGUID) return;
    const ator = await this.#usuarioDAO.findByCPF(usuarioCPFAtor);
    if (!ator) return;
    void getAuditoriaService().registrar({
      EscolaGUID: escolaGUID,
      UsuarioGUIDAtor: ator.UsuarioGUID,
      AcaoTipo: acaoTipo,
      EntidadeTipo: 'convitegrupotarefa',
      EntidadeGUID: conviteGUID,
      EntidadeDescricao: entidadeDescricao ?? null,
      CategoriaAuditoriaId: 1,
    });
  };

  /** Notifica o convidado (tipo `convite_grupo`) — só quando é um convite de fato, não solicitação */
  #notificarConviteGrupo = async (
    turmaGUID: string,
    tarefaGUID: string,
    liderCPF: string,
    convidadoCPF: string
  ): Promise<void> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.EscolaGUID, ta.TarefaTitulo, u.UsuarioNome AS LiderNome
       FROM turma t
       INNER JOIN tarefaacademica ta ON ta.TarefaGUID = ?
       INNER JOIN usuario u ON u.UsuarioCPF = ?
       WHERE t.TurmaGUID = ?
       LIMIT 1`,
      [tarefaGUID, liderCPF, turmaGUID]
    );
    const info = rows[0] as any;
    if (!info?.EscolaGUID) return;

    const convidado = await this.#usuarioDAO.findByCPF(convidadoCPF);
    if (!convidado) return;

    await getNotificacaoService().disparar({
      tipoSlug: 'convite_grupo',
      destinatarios: [convidado.UsuarioGUID],
      escolaGUID: info.EscolaGUID,
      titulo: `${info.LiderNome} te convidou para o grupo da tarefa "${info.TarefaTitulo}"`,
      entidadeTipo: 'tarefa',
      entidadeGUID: tarefaGUID,
    });
  };

  /**
   * ALUNO SOLICITA ENTRADA em grupo
   * Validações: aluno deve estar sozinho no próprio grupo, grupo não pode estar cheio
   */
  async solicitarEntrada(
    grupoGUID: string,
    solicitanteGUID: string
  ): Promise<ConviteGrupoTarefa> {
    console.log('🟣 ConviteGrupoTarefaService.solicitarEntrada()');

    // convitegrupotarefa ainda usa CPF — resolver o solicitante a partir do
    // UsuarioGUID.
    const solicitanteUsuario = await this.#usuarioDAO.findByGUID(solicitanteGUID);
    if (!solicitanteUsuario?.UsuarioCPF) {
      throw new ErrorResponse(403, 'Usuário sem CPF cadastrado');
    }
    const solicitanteCPF = solicitanteUsuario.UsuarioCPF;

    // 1. Validar grupo
    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    // 2. Validar se solicitante está sozinho no próprio grupo
    // TODO: Implementar validação completa

    // 3. Verificar se já existe solicitação pendente
    const existeSolicitacao = await this.#conviteDAO.existeConvitePendente(grupoGUID, solicitanteCPF);
    if (existeSolicitacao) {
      throw new ErrorResponse(409, 'Já existe uma solicitação pendente');
    }

    // 4. Criar solicitação
    const solicitacaoData: ConviteGrupoTarefaCreateDTO = {
      GrupoTarefaGUID: grupoGUID,
      UsuarioCPFConvidado: solicitanteCPF,
      ConviteTipo: 'Solicitacao'
    };

    const solicitacao = await this.#conviteDAO.create(solicitacaoData);

    this.#registrarAuditoriaConvite(grupo.TurmaGUID, solicitacao.ConviteGUID, 'Create', solicitanteCPF, 'Solicitação de entrada no grupo').catch((error) => {
      console.error('🔴 ConviteGrupoTarefaService.#registrarAuditoriaConvite() falhou:', error);
    });

    return solicitacao;
  }

  /**
   * ACEITAR CONVITE OU SOLICITAÇÃO
   * Transação complexa: move usuário para novo grupo
   */
  async aceitar(
    conviteGUID: string,
    usuarioGUID: string
  ): Promise<{ mensagem: string }> {
    console.log('🟣 ConviteGrupoTarefaService.aceitar()');

    // convitegrupotarefa/grupotarefa/usuarioxgrupotarefa/historicogrupotarefa
    // ainda usam CPF — resolver a partir do UsuarioGUID.
    const usuario = await this.#usuarioDAO.findByGUID(usuarioGUID);
    if (!usuario?.UsuarioCPF) {
      throw new ErrorResponse(403, 'Usuário sem CPF cadastrado');
    }
    const usuarioCPF = usuario.UsuarioCPF;

    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Buscar convite
      const convite = await this.#conviteDAO.findById(conviteGUID);
      if (!convite) {
        throw new ErrorResponse(404, 'Convite não encontrado');
      }

      if (convite.ConviteStatus !== 'Pendente') {
        throw new ErrorResponse(400, 'Convite não está mais pendente');
      }

      // 2. Validar autorização
      if (convite.ConviteTipo === 'Convite' && convite.UsuarioCPFConvidado !== usuarioCPF) {
        throw new ErrorResponse(403, 'Você não pode aceitar este convite');
      }

      const grupo = await this.#grupoTarefaDAO.findById(convite.GrupoTarefaGUID);
      if (!grupo) {
        throw new ErrorResponse(404, 'Grupo não encontrado');
      }

      if (convite.ConviteTipo === 'Solicitacao' && grupo.UsuarioCPFLider !== usuarioCPF) {
        throw new ErrorResponse(403, 'Apenas o líder pode aceitar solicitações');
      }

      // 3. Adicionar usuário ao grupo
      const novoMembroCPF = convite.UsuarioCPFConvidado;
      
      await this.#usuarioXGrupoDAO.create({
        GrupoTarefaGUID: convite.GrupoTarefaGUID,
        UsuarioCPF: novoMembroCPF
      });

      // 4. Atualizar status do convite
      await this.#conviteDAO.updateStatus(conviteGUID, 'Aceito');

      // 5. Registrar no histórico
      await this.#historicoService.registrar({
        GrupoTarefaGUID: convite.GrupoTarefaGUID,
        HistoricoTipo: 'Entrada',
        UsuarioCPFAtor: usuarioCPF,
        UsuarioCPFAlvo: novoMembroCPF,
        HistoricoDetalhes: {
          tipo: convite.ConviteTipo
        }
      });

      await connection.commit();

      this.#registrarAuditoriaConvite(grupo.TurmaGUID, conviteGUID, 'Update', usuarioCPF, `${convite.ConviteTipo} aceito`).catch((error) => {
        console.error('🔴 ConviteGrupoTarefaService.#registrarAuditoriaConvite() falhou:', error);
      });

      return {
        mensagem: `${convite.ConviteTipo} aceito com sucesso`
      };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * RECUSAR CONVITE OU SOLICITAÇÃO
   */
  async recusar(
    conviteGUID: string,
    usuarioGUID: string
  ): Promise<{ mensagem: string }> {
    console.log('🟣 ConviteGrupoTarefaService.recusar()');

    // convitegrupotarefa ainda usa CPF — resolver a partir do UsuarioGUID.
    const usuario = await this.#usuarioDAO.findByGUID(usuarioGUID);
    if (!usuario?.UsuarioCPF) {
      throw new ErrorResponse(403, 'Usuário sem CPF cadastrado');
    }
    const usuarioCPF = usuario.UsuarioCPF;

    // 1. Buscar convite
    const convite = await this.#conviteDAO.findById(conviteGUID);
    if (!convite) {
      throw new ErrorResponse(404, 'Convite não encontrado');
    }

    if (convite.ConviteStatus !== 'Pendente') {
      throw new ErrorResponse(400, 'Convite não está mais pendente');
    }

    // 2. Validar autorização
    if (convite.ConviteTipo === 'Convite' && convite.UsuarioCPFConvidado !== usuarioCPF) {
      throw new ErrorResponse(403, 'Você não pode recusar este convite');
    }

    const grupo = await this.#grupoTarefaDAO.findById(convite.GrupoTarefaGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (convite.ConviteTipo === 'Solicitacao' && grupo.UsuarioCPFLider !== usuarioCPF) {
      throw new ErrorResponse(403, 'Apenas o líder pode recusar solicitações');
    }

    // 3. Atualizar status
    await this.#conviteDAO.updateStatus(conviteGUID, 'Recusado');

    this.#registrarAuditoriaConvite(grupo.TurmaGUID, conviteGUID, 'Update', usuarioCPF, `${convite.ConviteTipo} recusado`).catch((error) => {
      console.error('🔴 ConviteGrupoTarefaService.#registrarAuditoriaConvite() falhou:', error);
    });

    return {
      mensagem: `${convite.ConviteTipo} recusado`
    };
  }

  /**
   * LISTAR CONVITES/SOLICITAÇÕES PENDENTES
   */
  async listarPendentes(usuarioGUID: string): Promise<ConviteGrupoTarefaDTO[]> {
    console.log('🟣 ConviteGrupoTarefaService.listarPendentes()');

    // convitegrupotarefa ainda usa CPF — resolver a partir do UsuarioGUID.
    const usuario = await this.#usuarioDAO.findByGUID(usuarioGUID);
    if (!usuario?.UsuarioCPF) {
      return [];
    }

    const convites = await this.#conviteDAO.findAllComDetalhes(usuario.UsuarioCPF);

    return convites;
  }
}
