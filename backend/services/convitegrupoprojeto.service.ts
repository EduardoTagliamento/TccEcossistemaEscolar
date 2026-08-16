import { ConviteGrupoProjetoDAO } from '../repositories/convitegrupoprojeto.repository';
import { GrupoProjetoDAO } from '../repositories/grupoprojeto.repository';
import { UsuarioXGrupoProjetoDAO } from '../repositories/usuarioxgrupoprojeto.repository';
import { ProjetoDAO } from '../repositories/projeto.repository';
import HistoricoGrupoProjetoService from './historicogrupoprojeto.service';
import GrupoProjetoService from './grupoprojeto.service';
import ErrorResponse from '../utils/ErrorResponse';
import MysqlDatabase from '../database/MysqlDatabase';
import { getNotificacaoService } from './notificacao.service';
import { getAuditoriaService } from './auditoria.service';
import { UsuarioDAO } from '../repositories/usuario.repository';
import {
  ConviteGrupoProjeto,
  ConviteGrupoProjetoCreateDTO,
  ConviteGrupoProjetoDTO
} from '../entities/convitegrupoprojeto.model';

export default class ConviteGrupoProjetoService {
  #conviteDAO: ConviteGrupoProjetoDAO;
  #grupoProjetoDAO: GrupoProjetoDAO;
  #usuarioXGrupoDAO: UsuarioXGrupoProjetoDAO;
  #projetoDAO: ProjetoDAO;
  #historicoService: HistoricoGrupoProjetoService;
  #grupoProjetoService: GrupoProjetoService;
  #database: MysqlDatabase;
  #usuarioDAO: UsuarioDAO;

  constructor(
    conviteDAO: ConviteGrupoProjetoDAO,
    grupoProjetoDAO: GrupoProjetoDAO,
    usuarioXGrupoDAO: UsuarioXGrupoProjetoDAO,
    projetoDAO: ProjetoDAO,
    historicoService: HistoricoGrupoProjetoService,
    grupoProjetoService: GrupoProjetoService,
    database: MysqlDatabase,
    usuarioDAO: UsuarioDAO
  ) {
    console.log('⬆️  ConviteGrupoProjetoService.constructor()');
    this.#conviteDAO = conviteDAO;
    this.#grupoProjetoDAO = grupoProjetoDAO;
    this.#usuarioXGrupoDAO = usuarioXGrupoDAO;
    this.#projetoDAO = projetoDAO;
    this.#historicoService = historicoService;
    this.#grupoProjetoService = grupoProjetoService;
    this.#database = database;
    this.#usuarioDAO = usuarioDAO;
  }

  /**
   * LÍDER ENVIA CONVITE para aluno.
   * O cliente ainda identifica o convidado por CPF (UX de "convidar por
   * CPF"), então resolvemos CPF -> GUID aqui antes de qualquer operação —
   * todo o resto do fluxo (grupoprojeto, convitegrupoprojeto, projeto) já
   * está migrado para GUID.
   * Diferente do TODO não implementado em ConviteGrupoTarefaService, aqui o
   * limite de vagas É validado no envio (ver
   * docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 4 regra 6).
   */
  enviarConvite = async (
    grupoGUID: string,
    convidadoCPF: string,
    liderGUID: string
  ): Promise<ConviteGrupoProjeto> => {
    console.log('🟣 ConviteGrupoProjetoService.enviarConvite()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (grupo.UsuarioGUIDLider !== liderGUID) {
      throw new ErrorResponse(403, 'Apenas o líder pode enviar convites');
    }

    const projeto = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    const totalMembros = await this.#grupoProjetoDAO.contarMembros(grupoGUID);
    if (totalMembros >= projeto.ProjetoGrupoMaxPessoas) {
      throw new ErrorResponse(400, 'Grupo já atingiu o limite máximo de integrantes');
    }

    const convidado = await this.#usuarioDAO.findByCPF(convidadoCPF);
    if (!convidado) {
      throw new ErrorResponse(404, 'Usuário com este CPF não encontrado');
    }
    const convidadoGUID = convidado.UsuarioGUID;

    const elegivel = await this.#projetoDAO.usuarioElegivel(grupo.ProjetoGUID, convidadoGUID);
    if (!elegivel) {
      throw new ErrorResponse(403, 'O aluno convidado não é elegível para participar deste projeto');
    }

    const existeConvite = await this.#conviteDAO.existeConvitePendente(grupoGUID, convidadoGUID);
    if (existeConvite) {
      throw new ErrorResponse(409, 'Já existe um convite pendente para este usuário');
    }

    const jaEstaNoGrupo = await this.#grupoProjetoDAO.usuarioPertenceAoGrupo(convidadoGUID, grupoGUID);
    if (jaEstaNoGrupo) {
      throw new ErrorResponse(400, 'Usuário já é membro do grupo');
    }

    const conviteData: ConviteGrupoProjetoCreateDTO = {
      GrupoProjetoGUID: grupoGUID,
      UsuarioGUIDConvidado: convidadoGUID,
      ConviteTipo: 'Convite'
    };

    const convite = await this.#conviteDAO.create(conviteData);

    getNotificacaoService().disparar({
      tipoSlug: 'convite_grupo_projeto',
      destinatarios: [convidadoGUID],
      escolaGUID: projeto.EscolaGUID,
      titulo: `Você recebeu um convite para um grupo do projeto "${projeto.ProjetoTitulo}"`,
      entidadeTipo: 'grupoprojeto',
      entidadeGUID: grupoGUID
    }).catch((error) => {
      console.error('🔴 ConviteGrupoProjetoService.enviarConvite() falhou ao notificar:', error);
    });

    void getAuditoriaService().registrar({
      EscolaGUID: projeto.EscolaGUID,
      UsuarioGUIDAtor: liderGUID,
      AcaoTipo: 'Create',
      EntidadeTipo: 'convitegrupoprojeto',
      EntidadeGUID: convite.ConviteGUID,
      EntidadeDescricao: `Convite enviado a ${convidadoCPF}`,
      CategoriaAuditoriaId: 1,
    });

    return convite;
  };

  /**
   * ALUNO SOLICITA ENTRADA em grupo (grupo `Fechado`).
   * Válido apenas se o aluno ainda não participa de outro grupo do mesmo
   * projeto — substitui a validação "estar sozinho" do módulo original de
   * Tarefa Compartilhada (aqui não há grupo automático a comparar).
   */
  solicitarEntrada = async (grupoGUID: string, solicitanteGUID: string): Promise<ConviteGrupoProjeto> => {
    console.log('🟣 ConviteGrupoProjetoService.solicitarEntrada()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    const projeto = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    const totalMembros = await this.#grupoProjetoDAO.contarMembros(grupoGUID);
    if (totalMembros >= projeto.ProjetoGrupoMaxPessoas) {
      throw new ErrorResponse(400, 'Grupo já atingiu o limite máximo de integrantes');
    }

    const elegivel = await this.#projetoDAO.usuarioElegivel(grupo.ProjetoGUID, solicitanteGUID);
    if (!elegivel) {
      throw new ErrorResponse(403, 'Você não é elegível para participar deste projeto');
    }

    const jaEstaNoGrupo = await this.#grupoProjetoDAO.usuarioPertenceAoGrupo(solicitanteGUID, grupoGUID);
    if (jaEstaNoGrupo) {
      throw new ErrorResponse(400, 'Você já é membro deste grupo');
    }

    const jaParticipaDoProjeto = await this.#usuarioXGrupoDAO.contarParticipacoesNoProjeto(solicitanteGUID, grupo.ProjetoGUID);
    if (jaParticipaDoProjeto > 0) {
      throw new ErrorResponse(409, 'Você já participa de outro grupo neste projeto');
    }

    const existeSolicitacao = await this.#conviteDAO.existeConvitePendente(grupoGUID, solicitanteGUID);
    if (existeSolicitacao) {
      throw new ErrorResponse(409, 'Já existe uma solicitação pendente');
    }

    const solicitacaoData: ConviteGrupoProjetoCreateDTO = {
      GrupoProjetoGUID: grupoGUID,
      UsuarioGUIDConvidado: solicitanteGUID,
      ConviteTipo: 'Solicitacao'
    };

    const solicitacao = await this.#conviteDAO.create(solicitacaoData);

    const lider = await this.#usuarioDAO.findByGUID(grupo.UsuarioGUIDLider);
    if (lider) {
      getNotificacaoService().disparar({
        tipoSlug: 'solicitacao_grupo_projeto',
        destinatarios: [lider.UsuarioGUID],
        escolaGUID: projeto.EscolaGUID,
        titulo: `Novo pedido de entrada no seu grupo do projeto "${projeto.ProjetoTitulo}"`,
        entidadeTipo: 'grupoprojeto',
        entidadeGUID: grupoGUID
      }).catch((error) => {
        console.error('🔴 ConviteGrupoProjetoService.solicitarEntrada() falhou ao notificar:', error);
      });
    }

    void getAuditoriaService().registrar({
      EscolaGUID: projeto.EscolaGUID,
      UsuarioGUIDAtor: solicitanteGUID,
      AcaoTipo: 'Create',
      EntidadeTipo: 'convitegrupoprojeto',
      EntidadeGUID: solicitacao.ConviteGUID,
      EntidadeDescricao: 'Solicitação de entrada no grupo',
      CategoriaAuditoriaId: 1,
    });

    return solicitacao;
  };

  /**
   * ACEITAR CONVITE OU SOLICITAÇÃO.
   * A entrada em si (com validação de vagas + histórico) é delegada a
   * GrupoProjetoService.entrarNoGrupoComLimiteDeVagas, mas aqui dentro de
   * uma transação própria (BEGIN/COMMIT/ROLLBACK) que também cobre o
   * `updateStatus` do convite — evita o convite ficar `Pendente` para
   * sempre se o processo cair entre as duas escritas (mesma proteção que
   * `ConviteGrupoTarefaService.aceitar` já tinha).
   */
  aceitar = async (conviteGUID: string, usuarioGUID: string): Promise<{ mensagem: string }> => {
    console.log('🟣 ConviteGrupoProjetoService.aceitar()');

    const convite = await this.#conviteDAO.findById(conviteGUID);
    if (!convite) {
      throw new ErrorResponse(404, 'Convite não encontrado');
    }

    if (convite.ConviteStatus !== 'Pendente') {
      throw new ErrorResponse(400, 'Convite não está mais pendente');
    }

    if (convite.ConviteTipo === 'Convite' && convite.UsuarioGUIDConvidado !== usuarioGUID) {
      throw new ErrorResponse(403, 'Você não pode aceitar este convite');
    }

    const grupo = await this.#grupoProjetoDAO.findById(convite.GrupoProjetoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (convite.ConviteTipo === 'Solicitacao' && grupo.UsuarioGUIDLider !== usuarioGUID) {
      throw new ErrorResponse(403, 'Apenas o líder pode aceitar solicitações');
    }

    const novoMembroGUID = convite.UsuarioGUIDConvidado;

    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await this.#grupoProjetoService.entrarNoGrupoComLimiteDeVagas(convite.GrupoProjetoGUID, novoMembroGUID, connection, usuarioGUID);
      await this.#conviteDAO.updateStatus(conviteGUID, 'Aceito', connection);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    const projetoDoGrupo = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (projetoDoGrupo) {
      void getAuditoriaService().registrar({
        EscolaGUID: projetoDoGrupo.EscolaGUID,
        UsuarioGUIDAtor: usuarioGUID,
        AcaoTipo: 'Update',
        EntidadeTipo: 'convitegrupoprojeto',
        EntidadeGUID: conviteGUID,
        EntidadeDescricao: `${convite.ConviteTipo} aceito`,
        CategoriaAuditoriaId: 1,
      });
    }

    return { mensagem: `${convite.ConviteTipo} aceito com sucesso` };
  };

  /**
   * RECUSAR CONVITE OU SOLICITAÇÃO
   */
  recusar = async (conviteGUID: string, usuarioGUID: string): Promise<{ mensagem: string }> => {
    console.log('🟣 ConviteGrupoProjetoService.recusar()');

    const convite = await this.#conviteDAO.findById(conviteGUID);
    if (!convite) {
      throw new ErrorResponse(404, 'Convite não encontrado');
    }

    if (convite.ConviteStatus !== 'Pendente') {
      throw new ErrorResponse(400, 'Convite não está mais pendente');
    }

    if (convite.ConviteTipo === 'Convite' && convite.UsuarioGUIDConvidado !== usuarioGUID) {
      throw new ErrorResponse(403, 'Você não pode recusar este convite');
    }

    const grupo = await this.#grupoProjetoDAO.findById(convite.GrupoProjetoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (convite.ConviteTipo === 'Solicitacao' && grupo.UsuarioGUIDLider !== usuarioGUID) {
      throw new ErrorResponse(403, 'Apenas o líder pode recusar solicitações');
    }

    await this.#conviteDAO.updateStatus(conviteGUID, 'Recusado');

    const projetoDoGrupo = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (projetoDoGrupo) {
      void getAuditoriaService().registrar({
        EscolaGUID: projetoDoGrupo.EscolaGUID,
        UsuarioGUIDAtor: usuarioGUID,
        AcaoTipo: 'Update',
        EntidadeTipo: 'convitegrupoprojeto',
        EntidadeGUID: conviteGUID,
        EntidadeDescricao: `${convite.ConviteTipo} recusado`,
        CategoriaAuditoriaId: 1,
      });
    }

    return { mensagem: `${convite.ConviteTipo} recusado` };
  };

  /**
   * LISTAR CONVITES/SOLICITAÇÕES PENDENTES do usuário
   */
  listarPendentes = async (usuarioGUID: string, escolaGUID?: string): Promise<ConviteGrupoProjetoDTO[]> => {
    console.log('🟣 ConviteGrupoProjetoService.listarPendentes()');
    return await this.#conviteDAO.findAllComDetalhes(usuarioGUID, escolaGUID);
  };
}
