import { GrupoProjetoDAO } from '../repositories/grupoprojeto.repository';
import { UsuarioXGrupoProjetoDAO } from '../repositories/usuarioxgrupoprojeto.repository';
import { ProjetoDAO } from '../repositories/projeto.repository';
import HistoricoGrupoProjetoService from './historicogrupoprojeto.service';
import ErrorResponse from '../utils/ErrorResponse';
import MysqlDatabase from '../database/MysqlDatabase';
import { Pool, PoolConnection } from 'mysql2/promise';
import { getNotificacaoService } from './notificacao.service';
import { getAuditoriaService } from './auditoria.service';
import { UsuarioDAO } from '../repositories/usuario.repository';
import { AnexoDAO } from '../repositories/anexo.repository';
import { RelacaoAnexosDAO } from '../repositories/relacaoanexos.repository';
import ConversaGrupoService from './conversa-grupo.service';
import { resolverPermissaoGrupoComLiderUnico } from '../utils/helpers/permissao-granular.helper';
import {
  GrupoProjetoComMembrosDTO,
  GrupoProjetoCreateDTO,
  GrupoProjetoUpdateDTO
} from '../entities/grupoprojeto.model';

/**
 * Grupo de Projeto integra com ConversaGrupoService desde 2026-08-21 (decisão
 * revertida — v1 deixava chat de fora, ver
 * docs/PLANO_IMPLEMENTACAO_PERMISSOES_GRANULARES_GRUPOS.md, seção 1b/#29).
 * `conversaGrupoService` é opcional (mesmo padrão de GrupoTarefaService) pra
 * não quebrar quem instancia este service sem esse argumento.
 */
export default class GrupoProjetoService {
  #grupoProjetoDAO: GrupoProjetoDAO;
  #usuarioXGrupoDAO: UsuarioXGrupoProjetoDAO;
  #projetoDAO: ProjetoDAO;
  #historicoService: HistoricoGrupoProjetoService;
  #database: MysqlDatabase;
  #usuarioDAO: UsuarioDAO;
  #anexoDAO?: AnexoDAO;
  #relacaoAnexosDAO?: RelacaoAnexosDAO;
  #conversaGrupoService?: ConversaGrupoService;

  constructor(
    grupoProjetoDAO: GrupoProjetoDAO,
    usuarioXGrupoDAO: UsuarioXGrupoProjetoDAO,
    projetoDAO: ProjetoDAO,
    historicoService: HistoricoGrupoProjetoService,
    database: MysqlDatabase,
    usuarioDAO: UsuarioDAO,
    anexoDAO?: AnexoDAO,
    relacaoAnexosDAO?: RelacaoAnexosDAO,
    conversaGrupoService?: ConversaGrupoService
  ) {
    console.log('⬆️  GrupoProjetoService.constructor()');
    this.#grupoProjetoDAO = grupoProjetoDAO;
    this.#usuarioXGrupoDAO = usuarioXGrupoDAO;
    this.#projetoDAO = projetoDAO;
    this.#historicoService = historicoService;
    this.#database = database;
    this.#usuarioDAO = usuarioDAO;
    this.#anexoDAO = anexoDAO;
    this.#relacaoAnexosDAO = relacaoAnexosDAO;
    this.#conversaGrupoService = conversaGrupoService;
  }

  /**
   * `historicogrupoprojeto.UsuarioCPFAlvo` é o único campo que ainda é CPF
   * de verdade neste domínio (não tem FK, nunca foi migrado — ver
   * docs/PROGRESSO_MIGRACAO_USUARIO_GUID.md, "Alertas menores"). É só
   * informativo (detalhe de histórico), então resolve best-effort: usuário
   * sem CPF cadastrado (piloto) simplesmente não populariza o campo, não
   * bloqueia a ação.
   */
  #resolverCPFAlvo = async (usuarioGUID: string): Promise<string | undefined> => {
    const usuario = await this.#usuarioDAO.findByGUID(usuarioGUID);
    return usuario?.UsuarioCPF ?? undefined;
  };

  /**
   * Anexa `MinhasPermissoes` ao DTO — capacidades do usuário autenticado
   * neste grupo, mesmo padrão de `ConversaService.buscarConversa`
   * (`MinhasPermissoes`), usado pelo frontend pra decidir quais ações
   * mostrar sem precisar tentar-e-receber-403.
   */
  #comMinhasPermissoes = async (
    grupo: GrupoProjetoComMembrosDTO,
    usuarioGUID: string
  ): Promise<GrupoProjetoComMembrosDTO> => {
    const membro = await this.#usuarioXGrupoDAO.findByGrupoAndUsuario(grupo.GrupoProjetoGUID, usuarioGUID);
    return {
      ...grupo,
      MinhasPermissoes: {
        PodeExpulsarMembros: resolverPermissaoGrupoComLiderUnico(usuarioGUID, grupo.UsuarioGUIDLider, membro?.MembroPermissoes, 'PodeExpulsarMembros'),
        PodeAtualizarGrupo: resolverPermissaoGrupoComLiderUnico(usuarioGUID, grupo.UsuarioGUIDLider, membro?.MembroPermissoes, 'PodeAtualizarGrupo'),
        PodeSubmeterProjeto: resolverPermissaoGrupoComLiderUnico(usuarioGUID, grupo.UsuarioGUIDLider, membro?.MembroPermissoes, 'PodeSubmeterProjeto'),
      }
    };
  };

  /**
   * CRIAR GRUPO — o próprio aluno cria seu grupo (líder = ele mesmo).
   * Diferente de Tarefa Compartilhada, não há criação automática — ver
   * docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 4 regra 2.
   */
  criarGrupo = async (data: GrupoProjetoCreateDTO, usuarioGUID: string): Promise<GrupoProjetoComMembrosDTO> => {
    console.log('🟣 GrupoProjetoService.criarGrupo()');

    const projeto = await this.#validarProjetoAbertoParaInscricao(data.ProjetoGUID);

    const elegivel = await this.#projetoDAO.usuarioElegivel(data.ProjetoGUID, usuarioGUID);
    if (!elegivel) {
      throw new ErrorResponse(403, 'Você não é elegível para participar deste projeto');
    }

    const jaParticipa = await this.#usuarioXGrupoDAO.contarParticipacoesNoProjeto(usuarioGUID, data.ProjetoGUID);
    if (jaParticipa > 0) {
      throw new ErrorResponse(409, 'Você já participa de um grupo neste projeto');
    }

    const grupoCriado = await this.#grupoProjetoDAO.create({ ...data, UsuarioGUIDLider: usuarioGUID });

    if (this.#conversaGrupoService) {
      await this.#conversaGrupoService.criarConversaParaGrupoProjeto(grupoCriado.GrupoProjetoGUID, projeto.ProjetoTitulo, usuarioGUID);
    }

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoCriado.GrupoProjetoGUID,
      HistoricoTipo: 'Entrada',
      UsuarioGUIDAtor: usuarioGUID,
      UsuarioCPFAlvo: await this.#resolverCPFAlvo(usuarioGUID),
      HistoricoDetalhes: { motivo: 'CriacaoGrupo' }
    });

    void getAuditoriaService().registrar({
      EscolaGUID: projeto.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUID,
      AcaoTipo: 'Create',
      EntidadeTipo: 'grupoprojeto',
      EntidadeGUID: grupoCriado.GrupoProjetoGUID,
      EntidadeDescricao: `Grupo criado no projeto "${projeto.ProjetoTitulo}"`,
      CategoriaAuditoriaId: 1,
    });

    const grupoComMembros = await this.#grupoProjetoDAO.findByIdComMembros(grupoCriado.GrupoProjetoGUID);
    if (!grupoComMembros) {
      throw new Error('Erro ao buscar grupo recém-criado');
    }

    return this.#comMinhasPermissoes(grupoComMembros, usuarioGUID);
  };

  /**
   * LISTAR GRUPOS de um projeto
   */
  listarGruposDoProjeto = async (projetoGUID: string, usuarioGUID: string): Promise<GrupoProjetoComMembrosDTO[]> => {
    console.log('🟣 GrupoProjetoService.listarGruposDoProjeto()');

    const projeto = await this.#projetoDAO.findById(projetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    const grupos = await this.#grupoProjetoDAO.findAll({ ProjetoGUID: projetoGUID });

    const gruposDetalhados: GrupoProjetoComMembrosDTO[] = [];
    for (const grupo of grupos) {
      const grupoComMembros = await this.#grupoProjetoDAO.findByIdComMembros(grupo.GrupoProjetoGUID);
      if (grupoComMembros) {
        gruposDetalhados.push(await this.#comMinhasPermissoes(grupoComMembros, usuarioGUID));
      }
    }

    return gruposDetalhados;
  };

  /**
   * BUSCAR GRUPO ESPECÍFICO (com membros).
   * Diferente de GrupoTarefa, a visualização não é restrita a membros —
   * grupos "Aberto" precisam ser navegáveis publicamente para que outros
   * alunos elegíveis decidam entrar; grupos "Fechado" mostram a proposta
   * mas não permitem entrada direta.
   */
  buscarGrupo = async (grupoGUID: string, usuarioGUID: string): Promise<GrupoProjetoComMembrosDTO> => {
    console.log('🟣 GrupoProjetoService.buscarGrupo()');

    const grupo = await this.#grupoProjetoDAO.findByIdComMembros(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    return this.#comMinhasPermissoes(grupo, usuarioGUID);
  };

  /**
   * ATUALIZAR GRUPO (nome/proposta/visibilidade) — apenas o líder
   */
  atualizarGrupo = async (
    grupoGUID: string,
    data: GrupoProjetoUpdateDTO,
    usuarioGUID: string
  ): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.atualizarGrupo()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    const membro = await this.#usuarioXGrupoDAO.findByGrupoAndUsuario(grupoGUID, usuarioGUID);
    const podeAtualizar = resolverPermissaoGrupoComLiderUnico(usuarioGUID, grupo.UsuarioGUIDLider, membro?.MembroPermissoes, 'PodeAtualizarGrupo');
    if (!podeAtualizar) {
      throw new ErrorResponse(403, 'Você não tem permissão para atualizar o grupo');
    }

    if (data.GrupoProjetoNome !== undefined && data.GrupoProjetoNome !== null && data.GrupoProjetoNome.length > 128) {
      throw new ErrorResponse(400, 'GrupoProjetoNome não pode exceder 128 caracteres');
    }

    if (data.GrupoProjetoProposta !== undefined && (data.GrupoProjetoProposta.trim().length < 1 || data.GrupoProjetoProposta.length > 2048)) {
      throw new ErrorResponse(400, 'GrupoProjetoProposta deve ter entre 1 e 2048 caracteres');
    }

    await this.#grupoProjetoDAO.update(grupoGUID, data);

    if (data.GrupoProjetoVisibilidade !== undefined && data.GrupoProjetoVisibilidade !== grupo.GrupoProjetoVisibilidade) {
      await this.#historicoService.registrar({
        GrupoProjetoGUID: grupoGUID,
        HistoricoTipo: 'MudancaVisibilidade',
        UsuarioGUIDAtor: usuarioGUID,
        HistoricoDetalhes: { de: grupo.GrupoProjetoVisibilidade, para: data.GrupoProjetoVisibilidade }
      });
    }

    const projetoDoGrupo = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (projetoDoGrupo) {
      void getAuditoriaService().registrar({
        EscolaGUID: projetoDoGrupo.EscolaGUID,
        UsuarioGUIDAtor: usuarioGUID,
        AcaoTipo: 'Update',
        EntidadeTipo: 'grupoprojeto',
        EntidadeGUID: grupoGUID,
        EntidadeDescricao: 'Grupo atualizado (nome/proposta/visibilidade)',
        CategoriaAuditoriaId: 1,
      });
    }

    return { mensagem: 'Grupo atualizado com sucesso' };
  };

  /**
   * CONCEDER/REVOGAR permissões granulares a um membro — só o líder concede
   * (nunca delegável, mesma regra do chat: quem recebe uma capacidade nunca
   * pode conceder capacidades a outros).
   */
  atualizarPermissaoMembro = async (
    grupoGUID: string,
    membroGUID: string,
    patch: Record<string, boolean>,
    atorGUID: string
  ): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.atualizarPermissaoMembro()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (grupo.UsuarioGUIDLider !== atorGUID) {
      throw new ErrorResponse(403, 'Apenas o líder pode conceder permissões a membros do grupo');
    }

    const isMembro = await this.#usuarioXGrupoDAO.isMembroNaoLider(membroGUID, grupoGUID);
    if (!isMembro) {
      throw new ErrorResponse(404, 'Usuário não é membro deste grupo');
    }

    await this.#usuarioXGrupoDAO.atualizarPermissoes(grupoGUID, membroGUID, patch);

    return { mensagem: 'Permissões atualizadas com sucesso' };
  };

  /**
   * ENTRAR DIRETAMENTE no grupo — apenas se GrupoProjetoVisibilidade='Aberto'
   */
  entrarGrupo = async (grupoGUID: string, usuarioGUID: string): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.entrarGrupo()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (grupo.GrupoProjetoVisibilidade !== 'Aberto') {
      throw new ErrorResponse(403, 'Este grupo é fechado — entrada só por convite ou solicitação aceita');
    }

    await this.#validarProjetoAbertoParaInscricao(grupo.ProjetoGUID);

    const elegivel = await this.#projetoDAO.usuarioElegivel(grupo.ProjetoGUID, usuarioGUID);
    if (!elegivel) {
      throw new ErrorResponse(403, 'Você não é elegível para participar deste projeto');
    }

    const jaPertence = await this.#grupoProjetoDAO.usuarioPertenceAoGrupo(usuarioGUID, grupoGUID);
    if (jaPertence) {
      throw new ErrorResponse(400, 'Você já é membro deste grupo');
    }

    const jaParticipaDoProjeto = await this.#usuarioXGrupoDAO.contarParticipacoesNoProjeto(usuarioGUID, grupo.ProjetoGUID);
    if (jaParticipaDoProjeto > 0) {
      throw new ErrorResponse(409, 'Você já participa de outro grupo neste projeto');
    }

    await this.#entrarNoGrupoComLimiteDeVagas(grupoGUID, usuarioGUID);

    return { mensagem: 'Você entrou no grupo com sucesso' };
  };

  /**
   * Adiciona o usuário a `usuarioxgrupoprojeto` validando limite de vagas
   * dentro de uma verificação atômica simples (contagem + insert). Reaproveitado
   * por `entrarGrupo`, `adicionarMembro` e por `ConviteGrupoProjetoService.aceitar`.
   *
   * Se `executor` for informado (uma `PoolConnection` já com transação aberta
   * pelo chamador), as 3 operações internas (contarMembros/create/registrar
   * histórico) rodam nela, sem abrir/commitar transação própria aqui — quem
   * chamou é responsável pelo commit/rollback (ver
   * `ConviteGrupoProjetoService.aceitar`). Se `executor` não for informado,
   * cada operação interna abre sua própria conexão via pool, como antes —
   * mantém `entrarGrupo`/`adicionarMembro` funcionando standalone.
   */
  entrarNoGrupoComLimiteDeVagas = async (
    grupoGUID: string,
    usuarioGUID: string,
    executor?: Pool | PoolConnection,
    atorGUIDOverride?: string
  ): Promise<void> => {
    return this.#entrarNoGrupoComLimiteDeVagas(grupoGUID, usuarioGUID, executor, atorGUIDOverride);
  };

  #entrarNoGrupoComLimiteDeVagas = async (
    grupoGUID: string,
    usuarioGUID: string,
    executor?: Pool | PoolConnection,
    atorGUIDOverride?: string
  ): Promise<void> => {
    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    const projeto = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    const totalMembros = await this.#grupoProjetoDAO.contarMembros(grupoGUID, executor);
    if (totalMembros >= projeto.ProjetoGrupoMaxPessoas) {
      throw new ErrorResponse(400, 'Grupo já atingiu o limite máximo de integrantes');
    }

    await this.#usuarioXGrupoDAO.create({ GrupoProjetoGUID: grupoGUID, UsuarioGUID: usuarioGUID }, executor);

    if (this.#conversaGrupoService) {
      await this.#conversaGrupoService.adicionarMembroGrupoProjeto(grupoGUID, usuarioGUID);
    }

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoGUID,
      HistoricoTipo: 'Entrada',
      UsuarioGUIDAtor: usuarioGUID,
      UsuarioCPFAlvo: await this.#resolverCPFAlvo(usuarioGUID)
    }, executor);

    // Auditoria: fire-and-forget, fora da transação do `executor` (registro
    // de auditoria é best-effort, não pode travar/participar do commit
    // principal — ver AuditoriaService.registrar()). `atorGUIDOverride`
    // existe pra ADICIONAR MEMBRO diretamente (adicionarMembro), onde quem
    // executa a ação (ator) é diferente de quem entra no grupo (usuarioGUID)
    // — sem isso a auditoria atribuiria erroneamente a ação ao membro
    // adicionado em vez de a quem adicionou.
    void getAuditoriaService().registrar({
      EscolaGUID: projeto.EscolaGUID,
      UsuarioGUIDAtor: atorGUIDOverride ?? usuarioGUID,
      AcaoTipo: 'Create',
      EntidadeTipo: 'grupoprojeto',
      EntidadeGUID: grupoGUID,
      EntidadeDescricao: `${usuarioGUID} entrou no grupo do projeto "${projeto.ProjetoTitulo}"`,
      CategoriaAuditoriaId: 1,
    });
  };

  /**
   * SAIR DO GRUPO — o próprio membro (não-líder) sai voluntariamente.
   * Se for o líder e houver outros membros, exige transferência de
   * liderança antes. Se for o líder sozinho, o grupo é dissolvido.
   */
  sairGrupo = async (grupoGUID: string, usuarioGUID: string): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.sairGrupo()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    const projeto = await this.#projetoDAO.findById(grupo.ProjetoGUID);

    if (grupo.UsuarioGUIDLider === usuarioGUID) {
      const totalMembros = await this.#grupoProjetoDAO.contarMembros(grupoGUID);
      if (totalMembros > 1) {
        throw new ErrorResponse(400, 'Transfira a liderança para outro membro antes de sair do grupo');
      }

      await this.#grupoProjetoDAO.delete(grupoGUID);

      if (this.#conversaGrupoService) {
        await this.#conversaGrupoService.encerrarConversaGrupoProjeto(grupoGUID);
      }

      if (projeto) {
        void getAuditoriaService().registrar({
          EscolaGUID: projeto.EscolaGUID,
          UsuarioGUIDAtor: usuarioGUID,
          AcaoTipo: 'Delete',
          EntidadeTipo: 'grupoprojeto',
          EntidadeGUID: grupoGUID,
          EntidadeDescricao: 'Grupo dissolvido — líder saiu sozinho',
          CategoriaAuditoriaId: 1,
        });
      }

      return { mensagem: 'Grupo dissolvido — você era o único integrante' };
    }

    const isMembro = await this.#usuarioXGrupoDAO.isMembroNaoLider(usuarioGUID, grupoGUID);
    if (!isMembro) {
      throw new ErrorResponse(404, 'Você não é membro deste grupo');
    }

    await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, usuarioGUID);

    if (this.#conversaGrupoService) {
      await this.#conversaGrupoService.removerMembroGrupoProjeto(grupoGUID, usuarioGUID);
    }

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoGUID,
      HistoricoTipo: 'Saida',
      UsuarioGUIDAtor: usuarioGUID,
      UsuarioCPFAlvo: await this.#resolverCPFAlvo(usuarioGUID)
    });

    if (projeto) {
      void getAuditoriaService().registrar({
        EscolaGUID: projeto.EscolaGUID,
        UsuarioGUIDAtor: usuarioGUID,
        AcaoTipo: 'Update',
        EntidadeTipo: 'grupoprojeto',
        EntidadeGUID: grupoGUID,
        EntidadeDescricao: 'Membro saiu do grupo',
        CategoriaAuditoriaId: 1,
      });
    }

    return { mensagem: 'Você saiu do grupo' };
  };

  /**
   * ADICIONAR MEMBRO diretamente — apenas o criador do Projeto pode, sem
   * passar por convite mesmo se o grupo for `Fechado` (ver Seção 4 regra 7).
   */
  adicionarMembro = async (
    grupoGUID: string,
    membroGUID: string,
    atorGUID: string
  ): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.adicionarMembro()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    const projeto = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    if (projeto.UsuarioGUIDCriador !== atorGUID) {
      throw new ErrorResponse(403, 'Apenas o criador do projeto pode adicionar membros diretamente');
    }

    const elegivel = await this.#projetoDAO.usuarioElegivel(grupo.ProjetoGUID, membroGUID);
    if (!elegivel) {
      throw new ErrorResponse(403, 'O aluno informado não é elegível para participar deste projeto');
    }

    const jaPertence = await this.#grupoProjetoDAO.usuarioPertenceAoGrupo(membroGUID, grupoGUID);
    if (jaPertence) {
      throw new ErrorResponse(400, 'Usuário já é membro deste grupo');
    }

    const jaParticipaDoProjeto = await this.#usuarioXGrupoDAO.contarParticipacoesNoProjeto(membroGUID, grupo.ProjetoGUID);
    if (jaParticipaDoProjeto > 0) {
      throw new ErrorResponse(409, 'O aluno já participa de outro grupo neste projeto');
    }

    await this.#entrarNoGrupoComLimiteDeVagas(grupoGUID, membroGUID, undefined, atorGUID);

    return { mensagem: 'Membro adicionado com sucesso' };
  };

  /**
   * EXPULSAR MEMBRO — líder do grupo OU criador do projeto.
   * Se o alvo for o próprio líder (só possível pelo criador do projeto),
   * promove o membro mais antigo ou dissolve o grupo (Seção 4 regra 7a).
   */
  expulsarMembro = async (
    grupoGUID: string,
    membroGUID: string,
    atorGUID: string
  ): Promise<{ mensagem: string; novoLiderGUID?: string; grupoDissolvido?: boolean }> => {
    console.log('🟣 GrupoProjetoService.expulsarMembro()');

    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
      if (!grupo) {
        throw new ErrorResponse(404, 'Grupo não encontrado');
      }

      const projeto = await this.#projetoDAO.findById(grupo.ProjetoGUID);
      if (!projeto) {
        throw new ErrorResponse(404, 'Projeto não encontrado');
      }

      const ehLider = grupo.UsuarioGUIDLider === atorGUID;
      const ehCriadorDoProjeto = projeto.UsuarioGUIDCriador === atorGUID;
      const atorMembro = await this.#usuarioXGrupoDAO.findByGrupoAndUsuario(grupoGUID, atorGUID);
      const podeExpulsar = ehLider || ehCriadorDoProjeto
        || resolverPermissaoGrupoComLiderUnico(atorGUID, grupo.UsuarioGUIDLider, atorMembro?.MembroPermissoes, 'PodeExpulsarMembros');

      if (!podeExpulsar) {
        throw new ErrorResponse(403, 'Você não tem permissão para expulsar membros deste grupo');
      }

      if (membroGUID === atorGUID) {
        throw new ErrorResponse(400, 'Você não pode expulsar a si mesmo — use a ação de sair do grupo');
      }

      // Expulsando o líder: só o criador do projeto pode fazer isso.
      if (membroGUID === grupo.UsuarioGUIDLider) {
        if (!ehCriadorDoProjeto) {
          throw new ErrorResponse(403, 'Apenas o criador do projeto pode remover o líder do grupo');
        }

        const proximoLider = await this.#usuarioXGrupoDAO.findMembroMaisAntigo(grupoGUID);

        if (!proximoLider) {
          await this.#grupoProjetoDAO.delete(grupoGUID);
          await connection.commit();

          if (this.#conversaGrupoService) {
            await this.#conversaGrupoService.encerrarConversaGrupoProjeto(grupoGUID);
          }

          this.#notificarRemovidoGrupo(projeto.EscolaGUID, projeto.ProjetoGUID, projeto.ProjetoTitulo, membroGUID, grupo.GrupoProjetoGUID).catch((error) => {
            console.error('🔴 GrupoProjetoService.#notificarRemovidoGrupo() falhou:', error);
          });

          void getAuditoriaService().registrar({
            EscolaGUID: projeto.EscolaGUID,
            UsuarioGUIDAtor: atorGUID,
            AcaoTipo: 'Delete',
            EntidadeTipo: 'grupoprojeto',
            EntidadeGUID: grupoGUID,
            EntidadeDescricao: `Líder ${membroGUID} removido — grupo dissolvido`,
            CategoriaAuditoriaId: 1,
          });

          return { mensagem: 'Líder removido — grupo dissolvido (não havia outros membros)', grupoDissolvido: true };
        }

        await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, proximoLider.UsuarioGUID);
        await this.#grupoProjetoDAO.update(grupoGUID, { UsuarioGUIDLider: proximoLider.UsuarioGUID });

        await this.#historicoService.registrar({
          GrupoProjetoGUID: grupoGUID,
          HistoricoTipo: 'Expulsao',
          UsuarioGUIDAtor: atorGUID,
          UsuarioCPFAlvo: await this.#resolverCPFAlvo(membroGUID),
          HistoricoDetalhes: { novoLiderGUID: proximoLider.UsuarioGUID }
        });

        await connection.commit();

        if (this.#conversaGrupoService) {
          await this.#conversaGrupoService.transferirLiderGrupoProjeto(grupoGUID, membroGUID, proximoLider.UsuarioGUID);
          await this.#conversaGrupoService.removerMembroGrupoProjeto(grupoGUID, membroGUID);
        }

        this.#notificarRemovidoGrupo(projeto.EscolaGUID, projeto.ProjetoGUID, projeto.ProjetoTitulo, membroGUID, grupoGUID).catch((error) => {
          console.error('🔴 GrupoProjetoService.#notificarRemovidoGrupo() falhou:', error);
        });

        void getAuditoriaService().registrar({
          EscolaGUID: projeto.EscolaGUID,
          UsuarioGUIDAtor: atorGUID,
          AcaoTipo: 'Delete',
          EntidadeTipo: 'grupoprojeto',
          EntidadeGUID: grupoGUID,
          EntidadeDescricao: `Líder ${membroGUID} removido — liderança transferida a ${proximoLider.UsuarioGUID}`,
          CategoriaAuditoriaId: 1,
        });

        return { mensagem: 'Líder removido — liderança transferida ao membro mais antigo', novoLiderGUID: proximoLider.UsuarioGUID };
      }

      // Expulsando um membro comum
      const isMembro = await this.#usuarioXGrupoDAO.isMembroNaoLider(membroGUID, grupoGUID);
      if (!isMembro) {
        throw new ErrorResponse(404, 'Usuário não é membro deste grupo');
      }

      await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, membroGUID);

      await this.#historicoService.registrar({
        GrupoProjetoGUID: grupoGUID,
        HistoricoTipo: 'Expulsao',
        UsuarioGUIDAtor: atorGUID,
        UsuarioCPFAlvo: await this.#resolverCPFAlvo(membroGUID)
      });

      await connection.commit();

      if (this.#conversaGrupoService) {
        await this.#conversaGrupoService.removerMembroGrupoProjeto(grupoGUID, membroGUID);
      }

      this.#notificarRemovidoGrupo(projeto.EscolaGUID, projeto.ProjetoGUID, projeto.ProjetoTitulo, membroGUID, grupoGUID).catch((error) => {
        console.error('🔴 GrupoProjetoService.#notificarRemovidoGrupo() falhou:', error);
      });

      void getAuditoriaService().registrar({
        EscolaGUID: projeto.EscolaGUID,
        UsuarioGUIDAtor: atorGUID,
        AcaoTipo: 'Delete',
        EntidadeTipo: 'grupoprojeto',
        EntidadeGUID: grupoGUID,
        EntidadeDescricao: `Membro ${membroGUID} expulso do grupo`,
        CategoriaAuditoriaId: 1,
      });

      return { mensagem: 'Membro expulso com sucesso' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  /** Notifica o membro removido (tipo `removido_grupo_projeto`) — link vai pro
   * projeto (não pro grupo em si) porque o grupo pode já ter sido dissolvido
   * no momento em que a notificação é disparada. */
  #notificarRemovidoGrupo = async (
    escolaGUID: string,
    projetoGUID: string,
    projetoTitulo: string,
    membroGUID: string,
    grupoGUID: string
  ): Promise<void> => {
    await getNotificacaoService().disparar({
      tipoSlug: 'removido_grupo_projeto',
      destinatarios: [membroGUID],
      escolaGUID,
      titulo: `Você foi removido(a) do grupo do projeto "${projetoTitulo}"`,
      entidadeTipo: 'grupoprojeto',
      entidadeGUID: grupoGUID,
      link: `/dashboard/${escolaGUID}/projetos/${projetoGUID}`,
    });
  };

  /**
   * TRANSFERIR LIDERANÇA — apenas o líder atual
   */
  transferirLideranca = async (
    grupoGUID: string,
    novoLiderGUID: string,
    liderAtualGUID: string
  ): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.transferirLideranca()');

    const pool = await this.#database.getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
      if (!grupo) {
        throw new ErrorResponse(404, 'Grupo não encontrado');
      }

      if (grupo.UsuarioGUIDLider !== liderAtualGUID) {
        throw new ErrorResponse(403, 'Apenas o líder pode transferir a liderança');
      }

      const isMembroNaoLider = await this.#usuarioXGrupoDAO.isMembroNaoLider(novoLiderGUID, grupoGUID);
      if (!isMembroNaoLider) {
        throw new ErrorResponse(400, 'Novo líder deve ser um membro do grupo');
      }

      await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, novoLiderGUID);
      await this.#usuarioXGrupoDAO.create({ GrupoProjetoGUID: grupoGUID, UsuarioGUID: liderAtualGUID });
      await this.#grupoProjetoDAO.update(grupoGUID, { UsuarioGUIDLider: novoLiderGUID });

      await this.#historicoService.registrar({
        GrupoProjetoGUID: grupoGUID,
        HistoricoTipo: 'TransferenciaLider',
        UsuarioGUIDAtor: liderAtualGUID,
        UsuarioCPFAlvo: await this.#resolverCPFAlvo(novoLiderGUID)
      });

      await connection.commit();

      if (this.#conversaGrupoService) {
        await this.#conversaGrupoService.transferirLiderGrupoProjeto(grupoGUID, liderAtualGUID, novoLiderGUID);
      }

      const projetoDoGrupo = await this.#projetoDAO.findById(grupo.ProjetoGUID);
      if (projetoDoGrupo) {
        void getAuditoriaService().registrar({
          EscolaGUID: projetoDoGrupo.EscolaGUID,
          UsuarioGUIDAtor: liderAtualGUID,
          AcaoTipo: 'Update',
          EntidadeTipo: 'grupoprojeto',
          EntidadeGUID: grupoGUID,
          EntidadeDescricao: `Liderança transferida para ${novoLiderGUID}`,
          CategoriaAuditoriaId: 1,
        });
      }

      return { mensagem: 'Liderança transferida com sucesso' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  /**
   * ATRIBUIR PONTUAÇÃO — apenas o criador do Projeto (Seção 1 decisão #7)
   */
  atualizarPontuacao = async (
    grupoGUID: string,
    pontuacao: number,
    usuarioGUID: string
  ): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.atualizarPontuacao()');

    if (isNaN(pontuacao) || pontuacao < 0) {
      throw new ErrorResponse(400, 'GrupoProjetoPontuacao deve ser um número >= 0');
    }

    const grupo = await this.#grupoProjetoDAO.findByIdComMembros(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    const projeto = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    if (projeto.UsuarioGUIDCriador !== usuarioGUID) {
      throw new ErrorResponse(403, 'Apenas o criador do projeto pode atribuir pontuação');
    }

    await this.#grupoProjetoDAO.atualizarPontuacao(grupoGUID, pontuacao);

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoGUID,
      HistoricoTipo: 'PontuacaoAtribuida',
      UsuarioGUIDAtor: usuarioGUID,
      HistoricoDetalhes: { pontuacao }
    });

    void getAuditoriaService().registrar({
      EscolaGUID: projeto.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUID,
      AcaoTipo: 'Update',
      EntidadeTipo: 'grupoprojeto',
      EntidadeGUID: grupoGUID,
      EntidadeDescricao: `Pontuação atribuída: ${pontuacao}`,
      CategoriaAuditoriaId: 1,
    });

    const destinatarios = grupo.Membros.map((m) => m.UsuarioGUID);
    getNotificacaoService().disparar({
      tipoSlug: 'projeto_pontuacao_atribuida',
      destinatarios,
      escolaGUID: projeto.EscolaGUID,
      titulo: `Seu grupo recebeu pontuação no projeto "${projeto.ProjetoTitulo}"`,
      entidadeTipo: 'grupoprojeto',
      entidadeGUID: grupoGUID,
      link: `/dashboard/${projeto.EscolaGUID}/projetos/${projeto.ProjetoGUID}/grupos/${grupoGUID}`,
    }).catch((error) => {
      console.error('🔴 GrupoProjetoService.atualizarPontuacao() falhou ao notificar:', error);
    });

    return { mensagem: 'Pontuação atribuída com sucesso' };
  };

  /**
   * VINCULAR ANEXO À SUBMISSÃO — membro com `PodeSubmeterProjeto` (líder
   * sempre tem, membro só com override explícito) anexa arquivos de entrega
   * antes de submeter. Segue o mesmo padrão de ownership-check de
   * `TarefaAcademicaService.enviarAnexoEntrega`: só quem enviou o anexo pode
   * vinculá-lo (evita um membro grudar o anexo de outra pessoa na entrega).
   */
  vincularAnexoSubmissao = async (
    grupoGUID: string,
    anexoGUID: string,
    usuarioGUID: string
  ): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.vincularAnexoSubmissao()');

    if (!this.#anexoDAO || !this.#relacaoAnexosDAO) {
      throw new ErrorResponse(500, 'Serviço mal configurado');
    }

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    const membro = await this.#usuarioXGrupoDAO.findByGrupoAndUsuario(grupoGUID, usuarioGUID);
    const podeSubmeter = resolverPermissaoGrupoComLiderUnico(usuarioGUID, grupo.UsuarioGUIDLider, membro?.MembroPermissoes, 'PodeSubmeterProjeto');
    if (!podeSubmeter) {
      throw new ErrorResponse(403, 'Você não tem permissão para submeter este projeto');
    }

    if (grupo.GrupoProjetoSubmetidoEm) {
      throw new ErrorResponse(400, 'Este grupo já submeteu o projeto');
    }

    const anexo = await this.#anexoDAO.findById(anexoGUID);
    if (!anexo) {
      throw new ErrorResponse(404, 'Anexo não encontrado');
    }

    if (anexo.UsuarioGUID !== usuarioGUID) {
      throw new ErrorResponse(403, 'Você só pode vincular anexos enviados por você');
    }

    await this.#relacaoAnexosDAO.vincularAnexoGrupoProjeto(anexoGUID, grupoGUID);

    return { mensagem: 'Anexo vinculado à submissão com sucesso' };
  };

  /**
   * SUBMETER PROJETO — marca a entrega do grupo como submetida. Exige ao
   * menos 1 anexo já vinculado (via `vincularAnexoSubmissao`) e bloqueia se
   * o projeto estiver encerrado ou o prazo de entrega já tiver passado.
   * Desfazer submissão fica fora de escopo desta rodada (ver
   * docs/PLANO_IMPLEMENTACAO_PERMISSOES_GRANULARES_GRUPOS.md, seção 4e).
   */
  submeterProjeto = async (
    grupoGUID: string,
    usuarioGUID: string
  ): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.submeterProjeto()');

    if (!this.#relacaoAnexosDAO) {
      throw new ErrorResponse(500, 'Serviço mal configurado');
    }

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    const membro = await this.#usuarioXGrupoDAO.findByGrupoAndUsuario(grupoGUID, usuarioGUID);
    const podeSubmeter = resolverPermissaoGrupoComLiderUnico(usuarioGUID, grupo.UsuarioGUIDLider, membro?.MembroPermissoes, 'PodeSubmeterProjeto');
    if (!podeSubmeter) {
      throw new ErrorResponse(403, 'Você não tem permissão para submeter este projeto');
    }

    if (grupo.GrupoProjetoSubmetidoEm) {
      throw new ErrorResponse(400, 'Este grupo já submeteu o projeto');
    }

    const projeto = await this.#projetoDAO.findById(grupo.ProjetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    if (projeto.ProjetoStatus === 'Encerrado') {
      throw new ErrorResponse(400, 'Projeto está encerrado');
    }

    if (projeto.ProjetoEntregaPrazoData && new Date(projeto.ProjetoEntregaPrazoData) < new Date()) {
      throw new ErrorResponse(400, 'Prazo de entrega do projeto já encerrou');
    }

    const anexos = await this.#relacaoAnexosDAO.findAnexosByGrupoProjeto(grupoGUID);
    if (anexos.length === 0) {
      throw new ErrorResponse(400, 'Vincule ao menos um anexo antes de submeter o projeto');
    }

    await this.#grupoProjetoDAO.update(grupoGUID, {
      GrupoProjetoSubmetidoEm: new Date(),
      GrupoProjetoSubmetidoPorGUID: usuarioGUID
    });

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoGUID,
      HistoricoTipo: 'Submissao',
      UsuarioGUIDAtor: usuarioGUID,
      UsuarioCPFAlvo: await this.#resolverCPFAlvo(usuarioGUID)
    });

    void getAuditoriaService().registrar({
      EscolaGUID: projeto.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUID,
      AcaoTipo: 'Update',
      EntidadeTipo: 'grupoprojeto',
      EntidadeGUID: grupoGUID,
      EntidadeDescricao: `Grupo submeteu o projeto "${projeto.ProjetoTitulo}"`,
      CategoriaAuditoriaId: 1,
    });

    this.#notificarProjetoSubmetido(projeto.EscolaGUID, projeto.ProjetoGUID, projeto.ProjetoTitulo, projeto.UsuarioGUIDCriador, grupoGUID).catch((error) => {
      console.error('🔴 GrupoProjetoService.#notificarProjetoSubmetido() falhou:', error);
    });

    return { mensagem: 'Projeto submetido com sucesso' };
  };

  #notificarProjetoSubmetido = async (
    escolaGUID: string,
    projetoGUID: string,
    projetoTitulo: string,
    criadorGUID: string,
    grupoGUID: string
  ): Promise<void> => {
    await getNotificacaoService().disparar({
      tipoSlug: 'projeto_submetido',
      destinatarios: [criadorGUID],
      escolaGUID,
      titulo: `Um grupo submeteu a entrega do projeto "${projetoTitulo}"`,
      entidadeTipo: 'grupoprojeto',
      entidadeGUID: grupoGUID,
      link: `/dashboard/${escolaGUID}/projetos/${projetoGUID}/grupos/${grupoGUID}`,
    });
  };

  #validarProjetoAbertoParaInscricao = async (projetoGUID: string) => {
    const projeto = await this.#projetoDAO.findById(projetoGUID);
    if (!projeto) {
      throw new ErrorResponse(404, 'Projeto não encontrado');
    }

    if (projeto.ProjetoStatus === 'Encerrado') {
      throw new ErrorResponse(400, 'Projeto está encerrado');
    }

    if (new Date(projeto.ProjetoInscricaoPrazoData) < new Date()) {
      throw new ErrorResponse(400, 'Prazo de inscrição do projeto já encerrou');
    }

    return projeto;
  };
}
