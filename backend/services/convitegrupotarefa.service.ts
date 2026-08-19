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
   * O cliente ainda identifica o convidado por CPF (UX de "convidar por
   * CPF"), então resolvemos CPF -> GUID aqui antes de qualquer operação.
   */
  async enviarConvite(
    grupoGUID: string,
    convidadoCPF: string,
    liderGUID: string
  ): Promise<ConviteGrupoTarefa> {
    console.log('🟣 ConviteGrupoTarefaService.enviarConvite()');

    // 1. Validar grupo
    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    // 2. Validar se quem envia é o líder
    if (grupo.UsuarioGUIDLider !== liderGUID) {
      throw new ErrorResponse(403, 'Apenas o líder pode enviar convites');
    }

    // 3. Validar se grupo não está cheio (contarMembros já inclui o líder)
    const totalMembros = await this.#grupoTarefaDAO.contarMembros(grupoGUID);
    const maxPessoas = await this.#buscarMaxPessoas(grupo.TarefaGUID);
    if (maxPessoas !== null && totalMembros >= maxPessoas) {
      throw new ErrorResponse(400, 'Grupo já atingiu o limite máximo de integrantes');
    }

    const convidado = await this.#usuarioDAO.findByCPF(convidadoCPF);
    if (!convidado) {
      throw new ErrorResponse(404, 'Usuário com este CPF não encontrado');
    }
    const convidadoGUID = convidado.UsuarioGUID;

    // 4. Verificar se já existe convite pendente
    const existeConvite = await this.#conviteDAO.existeConvitePendente(grupoGUID, convidadoGUID);
    if (existeConvite) {
      throw new ErrorResponse(409, 'Já existe um convite pendente para este usuário');
    }

    // 5. Verificar se convidado já está no grupo
    const jaEstaNoGrupo = await this.#grupoTarefaDAO.usuarioPertenceAoGrupo(convidadoGUID, grupoGUID);
    if (jaEstaNoGrupo) {
      throw new ErrorResponse(400, 'Usuário já é membro do grupo');
    }

    // 5b. Convidado só pode ser convidado se ainda estiver sozinho no próprio grupo (RF03)
    const convidadoSozinho = await this.#estaSozinhoNoProprioGrupo(convidadoGUID, grupo.TarefaGUID);
    if (!convidadoSozinho) {
      throw new ErrorResponse(400, 'Este usuário já formou o próprio grupo e não pode ser convidado');
    }

    // 6. Criar convite
    const conviteData: ConviteGrupoTarefaCreateDTO = {
      GrupoTarefaGUID: grupoGUID,
      UsuarioGUIDConvidado: convidadoGUID,
      ConviteTipo: 'Convite'
    };

    const convite = await this.#conviteDAO.create(conviteData);

    this.#notificarConviteGrupo(grupo.TurmaGUID, grupo.TarefaGUID, liderGUID, convidadoGUID).catch((error) => {
      console.error('🔴 ConviteGrupoTarefaService.#notificarConviteGrupo() falhou:', error);
    });

    this.#registrarAuditoriaConvite(grupo.TurmaGUID, convite.ConviteGUID, 'Create', liderGUID, `Convite enviado a ${convidadoCPF}`).catch((error) => {
      console.error('🔴 ConviteGrupoTarefaService.#registrarAuditoriaConvite() falhou:', error);
    });

    return convite;
  }

  /** Limite máximo de integrantes definido na tarefa compartilhada (null = sem limite definido). */
  #buscarMaxPessoas = async (tarefaGUID: string): Promise<number | null> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT TarefaMaxPessoas FROM tarefaacademica WHERE TarefaGUID = ? LIMIT 1`,
      [tarefaGUID]
    );
    return (rows[0] as any)?.TarefaMaxPessoas ?? null;
  };

  /**
   * RF02/RF03 (docs/PLANO_IMPLEMENTACAO_TAREFA_COMPARTILHADA.md): toda tarefa
   * compartilhada cria automaticamente 1 grupo solo por aluno, com o próprio
   * aluno como líder. "Estar sozinho no próprio grupo" é a pré-condição pra
   * poder convidar/ser convidado/solicitar entrada em outro grupo — sem isso
   * um aluno que já formou grupo próprio poderia entrar em outro e deixar o
   * primeiro grupo órfão (com membros, sem líder ativo cuidando dele).
   */
  #estaSozinhoNoProprioGrupo = async (usuarioGUID: string, tarefaGUID: string): Promise<boolean> => {
    const proprioGrupo = await this.#grupoTarefaDAO.findGrupoOndeEhLider(usuarioGUID, tarefaGUID);
    if (!proprioGrupo) return true;
    const membros = await this.#usuarioXGrupoDAO.findByGrupo(proprioGrupo.GrupoTarefaGUID);
    return membros.length === 0;
  };

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
    usuarioGUIDAtor: string,
    entidadeDescricao?: string
  ): Promise<void> => {
    const escolaGUID = await this.#resolverEscolaGUID(turmaGUID);
    if (!escolaGUID) return;
    void getAuditoriaService().registrar({
      EscolaGUID: escolaGUID,
      UsuarioGUIDAtor: usuarioGUIDAtor,
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
    liderGUID: string,
    convidadoGUID: string
  ): Promise<void> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.EscolaGUID, ta.TarefaTitulo, u.UsuarioNome AS LiderNome
       FROM turma t
       INNER JOIN tarefaacademica ta ON ta.TarefaGUID = ?
       INNER JOIN usuario u ON u.UsuarioGUID = ?
       WHERE t.TurmaGUID = ?
       LIMIT 1`,
      [tarefaGUID, liderGUID, turmaGUID]
    );
    const info = rows[0] as any;
    if (!info?.EscolaGUID) return;

    await getNotificacaoService().disparar({
      tipoSlug: 'convite_grupo',
      destinatarios: [convidadoGUID],
      escolaGUID: info.EscolaGUID,
      titulo: `${info.LiderNome} te convidou para o grupo da tarefa "${info.TarefaTitulo}"`,
      entidadeTipo: 'tarefa',
      entidadeGUID: tarefaGUID,
      link: `/dashboard/${info.EscolaGUID}/tarefas/${tarefaGUID}`,
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

    // 1. Validar grupo
    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    // 2. Validar se o solicitante ainda está sozinho no próprio grupo (RF03)
    const solicitanteSozinho = await this.#estaSozinhoNoProprioGrupo(solicitanteGUID, grupo.TarefaGUID);
    if (!solicitanteSozinho) {
      throw new ErrorResponse(400, 'Você já formou o próprio grupo e não pode solicitar entrada em outro');
    }

    // 2b. Validar se grupo alvo não está cheio (contarMembros já inclui o líder)
    const totalMembros = await this.#grupoTarefaDAO.contarMembros(grupoGUID);
    const maxPessoas = await this.#buscarMaxPessoas(grupo.TarefaGUID);
    if (maxPessoas !== null && totalMembros >= maxPessoas) {
      throw new ErrorResponse(400, 'Grupo já atingiu o limite máximo de integrantes');
    }

    // 3. Verificar se já existe solicitação pendente
    const existeSolicitacao = await this.#conviteDAO.existeConvitePendente(grupoGUID, solicitanteGUID);
    if (existeSolicitacao) {
      throw new ErrorResponse(409, 'Já existe uma solicitação pendente');
    }

    // 4. Criar solicitação
    const solicitacaoData: ConviteGrupoTarefaCreateDTO = {
      GrupoTarefaGUID: grupoGUID,
      UsuarioGUIDConvidado: solicitanteGUID,
      ConviteTipo: 'Solicitacao'
    };

    const solicitacao = await this.#conviteDAO.create(solicitacaoData);

    this.#registrarAuditoriaConvite(grupo.TurmaGUID, solicitacao.ConviteGUID, 'Create', solicitanteGUID, 'Solicitação de entrada no grupo').catch((error) => {
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
      if (convite.ConviteTipo === 'Convite' && convite.UsuarioGUIDConvidado !== usuarioGUID) {
        throw new ErrorResponse(403, 'Você não pode aceitar este convite');
      }

      const grupo = await this.#grupoTarefaDAO.findById(convite.GrupoTarefaGUID);
      if (!grupo) {
        throw new ErrorResponse(404, 'Grupo não encontrado');
      }

      if (convite.ConviteTipo === 'Solicitacao' && grupo.UsuarioGUIDLider !== usuarioGUID) {
        throw new ErrorResponse(403, 'Apenas o líder pode aceitar solicitações');
      }

      const novoMembroGUID = convite.UsuarioGUIDConvidado;

      // 2b. RF04: revalidar no momento do aceite (o estado pode ter mudado
      // desde que o convite/solicitação foi criado) — grupo alvo pode ter
      // enchido enquanto o convite ficava pendente; se sim, o convite é
      // descartado (não fica pendente pra sempre apontando pra um grupo cheio).
      const totalMembrosAtual = await this.#grupoTarefaDAO.contarMembros(convite.GrupoTarefaGUID);
      const maxPessoas = await this.#buscarMaxPessoas(grupo.TarefaGUID);
      if (maxPessoas !== null && totalMembrosAtual >= maxPessoas) {
        await this.#conviteDAO.updateStatus(conviteGUID, 'Recusado');
        throw new ErrorResponse(400, 'Grupo já atingiu o limite máximo de integrantes');
      }

      // 2c. RF04: novoMembroGUID só pode aceitar se ainda estiver sozinho no
      // próprio grupo (pode ter formado grupo próprio nesse meio-tempo).
      const aindaSozinho = await this.#estaSozinhoNoProprioGrupo(novoMembroGUID, grupo.TarefaGUID);
      if (!aindaSozinho) {
        throw new ErrorResponse(400, 'Você já formou o próprio grupo e não pode mais aceitar este convite/solicitação');
      }

      // 3. Adicionar usuário ao grupo
      await this.#usuarioXGrupoDAO.create({
        GrupoTarefaGUID: convite.GrupoTarefaGUID,
        UsuarioGUID: novoMembroGUID
      });

      // 3b. RF04: o grupo solo original do aluno (onde ele era líder sozinho)
      // é deletado — FKs de convitegrupotarefa/usuarioxgrupotarefa pra esse
      // grupo são ON DELETE CASCADE, não deixa órfão.
      const grupoOriginal = await this.#grupoTarefaDAO.findGrupoOndeEhLider(novoMembroGUID, grupo.TarefaGUID);
      if (grupoOriginal && grupoOriginal.GrupoTarefaGUID !== convite.GrupoTarefaGUID) {
        await this.#grupoTarefaDAO.delete(grupoOriginal.GrupoTarefaGUID);
      }

      // 4. Atualizar status do convite
      await this.#conviteDAO.updateStatus(conviteGUID, 'Aceito');

      // 5. Registrar no histórico
      await this.#historicoService.registrar({
        GrupoTarefaGUID: convite.GrupoTarefaGUID,
        HistoricoTipo: 'Entrada',
        UsuarioCPFAtor: usuarioGUID,
        UsuarioCPFAlvo: novoMembroGUID,
        HistoricoDetalhes: {
          tipo: convite.ConviteTipo
        }
      });

      await connection.commit();

      this.#registrarAuditoriaConvite(grupo.TurmaGUID, conviteGUID, 'Update', usuarioGUID, `${convite.ConviteTipo} aceito`).catch((error) => {
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
   * LISTAR ALUNOS DISPONÍVEIS PRA CONVIDAR — matriculados na turma da tarefa,
   * exceto quem já é membro deste grupo. `TemMembros` sinaliza quem já
   * formou o próprio grupo (RF03: não pode ser convidado enquanto isso não
   * mudar) — o frontend usa isso pra desabilitar o botão de convite.
   * Só o líder do grupo pode ver esta lista (mesma pessoa que envia convites).
   */
  async listarAlunosDisponiveis(
    grupoGUID: string,
    solicitanteGUID: string
  ): Promise<Array<{ UsuarioGUID: string; UsuarioCPF: string | null; UsuarioNome: string; UsuarioEmail: string | null; TemMembros: boolean }>> {
    console.log('🟣 ConviteGrupoTarefaService.listarAlunosDisponiveis()');

    const grupo = await this.#grupoTarefaDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }
    if (grupo.UsuarioGUIDLider !== solicitanteGUID) {
      throw new ErrorResponse(403, 'Apenas o líder pode ver os alunos disponíveis para convite');
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT u.UsuarioGUID, u.UsuarioCPF, u.UsuarioNome, u.UsuarioEmail,
         EXISTS (
           SELECT 1 FROM grupotarefa gt2
           INNER JOIN usuarioxgrupotarefa uxgt2 ON uxgt2.GrupoTarefaGUID = gt2.GrupoTarefaGUID
           WHERE gt2.TarefaGUID = ? AND gt2.UsuarioGUIDLider = u.UsuarioGUID
         ) AS TemMembros
       FROM matricula m
       INNER JOIN usuario u ON u.UsuarioGUID = m.UsuarioGUID
       WHERE m.TurmaGUID = ?
         AND m.MatriculaStatus = 'Ativa'
         AND u.UsuarioGUID != ?
         AND u.UsuarioGUID NOT IN (
           SELECT UsuarioGUID FROM usuarioxgrupotarefa WHERE GrupoTarefaGUID = ?
         )
       ORDER BY u.UsuarioNome ASC`,
      [grupo.TarefaGUID, grupo.TurmaGUID, solicitanteGUID, grupoGUID]
    );

    return (rows as any[]).map((row) => ({
      UsuarioGUID: row.UsuarioGUID,
      UsuarioCPF: row.UsuarioCPF,
      UsuarioNome: row.UsuarioNome,
      UsuarioEmail: row.UsuarioEmail,
      TemMembros: Boolean(row.TemMembros),
    }));
  }

  /**
   * RECUSAR CONVITE OU SOLICITAÇÃO
   */
  async recusar(
    conviteGUID: string,
    usuarioGUID: string
  ): Promise<{ mensagem: string }> {
    console.log('🟣 ConviteGrupoTarefaService.recusar()');

    // 1. Buscar convite
    const convite = await this.#conviteDAO.findById(conviteGUID);
    if (!convite) {
      throw new ErrorResponse(404, 'Convite não encontrado');
    }

    if (convite.ConviteStatus !== 'Pendente') {
      throw new ErrorResponse(400, 'Convite não está mais pendente');
    }

    // 2. Validar autorização
    if (convite.ConviteTipo === 'Convite' && convite.UsuarioGUIDConvidado !== usuarioGUID) {
      throw new ErrorResponse(403, 'Você não pode recusar este convite');
    }

    const grupo = await this.#grupoTarefaDAO.findById(convite.GrupoTarefaGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (convite.ConviteTipo === 'Solicitacao' && grupo.UsuarioGUIDLider !== usuarioGUID) {
      throw new ErrorResponse(403, 'Apenas o líder pode recusar solicitações');
    }

    // 3. Atualizar status
    await this.#conviteDAO.updateStatus(conviteGUID, 'Recusado');

    this.#registrarAuditoriaConvite(grupo.TurmaGUID, conviteGUID, 'Update', usuarioGUID, `${convite.ConviteTipo} recusado`).catch((error) => {
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
    return await this.#conviteDAO.findAllComDetalhes(usuarioGUID);
  }
}
