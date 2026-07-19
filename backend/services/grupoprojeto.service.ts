import { GrupoProjetoDAO } from '../repositories/grupoprojeto.repository';
import { UsuarioXGrupoProjetoDAO } from '../repositories/usuarioxgrupoprojeto.repository';
import { ProjetoDAO } from '../repositories/projeto.repository';
import HistoricoGrupoProjetoService from './historicogrupoprojeto.service';
import ErrorResponse from '../utils/ErrorResponse';
import MysqlDatabase from '../database/MysqlDatabase';
import { Pool, PoolConnection } from 'mysql2/promise';
import { getNotificacaoService } from './notificacao.service';
import {
  GrupoProjetoComMembrosDTO,
  GrupoProjetoCreateDTO,
  GrupoProjetoUpdateDTO
} from '../entities/grupoprojeto.model';

/**
 * NOTA: diferente de GrupoTarefaService, este service NÃO integra com
 * ConversaGrupoService — chat de grupo foi deliberadamente deixado fora do
 * escopo da v1 (ver docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 7 ponto 4).
 * ConversaGrupoService hoje rotula toda conversa de grupo criada via
 * `criarConversaParaGrupoTarefa` com RefTipo='Tarefa' — reaproveitar sem
 * generalizar esse rótulo primeiro misturaria GUIDs de GrupoProjeto sob um
 * tipo de referência errado.
 */
export default class GrupoProjetoService {
  #grupoProjetoDAO: GrupoProjetoDAO;
  #usuarioXGrupoDAO: UsuarioXGrupoProjetoDAO;
  #projetoDAO: ProjetoDAO;
  #historicoService: HistoricoGrupoProjetoService;
  #database: MysqlDatabase;

  constructor(
    grupoProjetoDAO: GrupoProjetoDAO,
    usuarioXGrupoDAO: UsuarioXGrupoProjetoDAO,
    projetoDAO: ProjetoDAO,
    historicoService: HistoricoGrupoProjetoService,
    database: MysqlDatabase
  ) {
    console.log('⬆️  GrupoProjetoService.constructor()');
    this.#grupoProjetoDAO = grupoProjetoDAO;
    this.#usuarioXGrupoDAO = usuarioXGrupoDAO;
    this.#projetoDAO = projetoDAO;
    this.#historicoService = historicoService;
    this.#database = database;
  }

  /**
   * CRIAR GRUPO — o próprio aluno cria seu grupo (líder = ele mesmo).
   * Diferente de Tarefa Compartilhada, não há criação automática — ver
   * docs/PLANO_IMPLEMENTACAO_PROJETOS.md, Seção 4 regra 2.
   */
  criarGrupo = async (data: GrupoProjetoCreateDTO, usuarioCPF: string): Promise<GrupoProjetoComMembrosDTO> => {
    console.log('🟣 GrupoProjetoService.criarGrupo()');

    const projeto = await this.#validarProjetoAbertoParaInscricao(data.ProjetoGUID);

    const elegivel = await this.#projetoDAO.usuarioElegivel(data.ProjetoGUID, usuarioCPF);
    if (!elegivel) {
      throw new ErrorResponse(403, 'Você não é elegível para participar deste projeto');
    }

    const jaParticipa = await this.#usuarioXGrupoDAO.contarParticipacoesNoProjeto(usuarioCPF, data.ProjetoGUID);
    if (jaParticipa > 0) {
      throw new ErrorResponse(409, 'Você já participa de um grupo neste projeto');
    }

    const grupoCriado = await this.#grupoProjetoDAO.create({ ...data, UsuarioCPFLider: usuarioCPF });

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoCriado.GrupoProjetoGUID,
      HistoricoTipo: 'Entrada',
      UsuarioCPFAtor: usuarioCPF,
      UsuarioCPFAlvo: usuarioCPF,
      HistoricoDetalhes: { motivo: 'CriacaoGrupo' }
    });

    const grupoComMembros = await this.#grupoProjetoDAO.findByIdComMembros(grupoCriado.GrupoProjetoGUID);
    if (!grupoComMembros) {
      throw new Error('Erro ao buscar grupo recém-criado');
    }

    return grupoComMembros;
  };

  /**
   * LISTAR GRUPOS de um projeto
   */
  listarGruposDoProjeto = async (projetoGUID: string): Promise<GrupoProjetoComMembrosDTO[]> => {
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
        gruposDetalhados.push(grupoComMembros);
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
  buscarGrupo = async (grupoGUID: string): Promise<GrupoProjetoComMembrosDTO> => {
    console.log('🟣 GrupoProjetoService.buscarGrupo()');

    const grupo = await this.#grupoProjetoDAO.findByIdComMembros(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    return grupo;
  };

  /**
   * ATUALIZAR GRUPO (nome/proposta/visibilidade) — apenas o líder
   */
  atualizarGrupo = async (
    grupoGUID: string,
    data: GrupoProjetoUpdateDTO,
    usuarioCPF: string
  ): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.atualizarGrupo()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (grupo.UsuarioCPFLider !== usuarioCPF) {
      throw new ErrorResponse(403, 'Apenas o líder pode atualizar o grupo');
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
        UsuarioCPFAtor: usuarioCPF,
        HistoricoDetalhes: { de: grupo.GrupoProjetoVisibilidade, para: data.GrupoProjetoVisibilidade }
      });
    }

    return { mensagem: 'Grupo atualizado com sucesso' };
  };

  /**
   * ENTRAR DIRETAMENTE no grupo — apenas se GrupoProjetoVisibilidade='Aberto'
   */
  entrarGrupo = async (grupoGUID: string, usuarioCPF: string): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.entrarGrupo()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (grupo.GrupoProjetoVisibilidade !== 'Aberto') {
      throw new ErrorResponse(403, 'Este grupo é fechado — entrada só por convite ou solicitação aceita');
    }

    await this.#validarProjetoAbertoParaInscricao(grupo.ProjetoGUID);

    const elegivel = await this.#projetoDAO.usuarioElegivel(grupo.ProjetoGUID, usuarioCPF);
    if (!elegivel) {
      throw new ErrorResponse(403, 'Você não é elegível para participar deste projeto');
    }

    const jaPertence = await this.#grupoProjetoDAO.usuarioPertenceAoGrupo(usuarioCPF, grupoGUID);
    if (jaPertence) {
      throw new ErrorResponse(400, 'Você já é membro deste grupo');
    }

    const jaParticipaDoProjeto = await this.#usuarioXGrupoDAO.contarParticipacoesNoProjeto(usuarioCPF, grupo.ProjetoGUID);
    if (jaParticipaDoProjeto > 0) {
      throw new ErrorResponse(409, 'Você já participa de outro grupo neste projeto');
    }

    await this.#entrarNoGrupoComLimiteDeVagas(grupoGUID, usuarioCPF);

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
  entrarNoGrupoComLimiteDeVagas = async (grupoGUID: string, usuarioCPF: string, executor?: Pool | PoolConnection): Promise<void> => {
    return this.#entrarNoGrupoComLimiteDeVagas(grupoGUID, usuarioCPF, executor);
  };

  #entrarNoGrupoComLimiteDeVagas = async (grupoGUID: string, usuarioCPF: string, executor?: Pool | PoolConnection): Promise<void> => {
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

    await this.#usuarioXGrupoDAO.create({ GrupoProjetoGUID: grupoGUID, UsuarioCPF: usuarioCPF }, executor);

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoGUID,
      HistoricoTipo: 'Entrada',
      UsuarioCPFAtor: usuarioCPF,
      UsuarioCPFAlvo: usuarioCPF
    }, executor);
  };

  /**
   * SAIR DO GRUPO — o próprio membro (não-líder) sai voluntariamente.
   * Se for o líder e houver outros membros, exige transferência de
   * liderança antes. Se for o líder sozinho, o grupo é dissolvido.
   */
  sairGrupo = async (grupoGUID: string, usuarioCPF: string): Promise<{ mensagem: string }> => {
    console.log('🟣 GrupoProjetoService.sairGrupo()');

    const grupo = await this.#grupoProjetoDAO.findById(grupoGUID);
    if (!grupo) {
      throw new ErrorResponse(404, 'Grupo não encontrado');
    }

    if (grupo.UsuarioCPFLider === usuarioCPF) {
      const totalMembros = await this.#grupoProjetoDAO.contarMembros(grupoGUID);
      if (totalMembros > 1) {
        throw new ErrorResponse(400, 'Transfira a liderança para outro membro antes de sair do grupo');
      }

      await this.#grupoProjetoDAO.delete(grupoGUID);
      return { mensagem: 'Grupo dissolvido — você era o único integrante' };
    }

    const isMembro = await this.#usuarioXGrupoDAO.isMembroNaoLider(usuarioCPF, grupoGUID);
    if (!isMembro) {
      throw new ErrorResponse(404, 'Você não é membro deste grupo');
    }

    await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, usuarioCPF);

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoGUID,
      HistoricoTipo: 'Saida',
      UsuarioCPFAtor: usuarioCPF,
      UsuarioCPFAlvo: usuarioCPF
    });

    return { mensagem: 'Você saiu do grupo' };
  };

  /**
   * ADICIONAR MEMBRO diretamente — apenas o criador do Projeto pode, sem
   * passar por convite mesmo se o grupo for `Fechado` (ver Seção 4 regra 7).
   */
  adicionarMembro = async (
    grupoGUID: string,
    membroCPF: string,
    atorCPF: string
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

    if (projeto.UsuarioCPFCriador !== atorCPF) {
      throw new ErrorResponse(403, 'Apenas o criador do projeto pode adicionar membros diretamente');
    }

    const elegivel = await this.#projetoDAO.usuarioElegivel(grupo.ProjetoGUID, membroCPF);
    if (!elegivel) {
      throw new ErrorResponse(403, 'O aluno informado não é elegível para participar deste projeto');
    }

    const jaPertence = await this.#grupoProjetoDAO.usuarioPertenceAoGrupo(membroCPF, grupoGUID);
    if (jaPertence) {
      throw new ErrorResponse(400, 'Usuário já é membro deste grupo');
    }

    const jaParticipaDoProjeto = await this.#usuarioXGrupoDAO.contarParticipacoesNoProjeto(membroCPF, grupo.ProjetoGUID);
    if (jaParticipaDoProjeto > 0) {
      throw new ErrorResponse(409, 'O aluno já participa de outro grupo neste projeto');
    }

    await this.#entrarNoGrupoComLimiteDeVagas(grupoGUID, membroCPF);

    return { mensagem: 'Membro adicionado com sucesso' };
  };

  /**
   * EXPULSAR MEMBRO — líder do grupo OU criador do projeto.
   * Se o alvo for o próprio líder (só possível pelo criador do projeto),
   * promove o membro mais antigo ou dissolve o grupo (Seção 4 regra 7a).
   */
  expulsarMembro = async (
    grupoGUID: string,
    membroCPF: string,
    atorCPF: string
  ): Promise<{ mensagem: string; novoLiderCPF?: string; grupoDissolvido?: boolean }> => {
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

      const ehLider = grupo.UsuarioCPFLider === atorCPF;
      const ehCriadorDoProjeto = projeto.UsuarioCPFCriador === atorCPF;

      if (!ehLider && !ehCriadorDoProjeto) {
        throw new ErrorResponse(403, 'Apenas o líder do grupo ou o criador do projeto podem expulsar membros');
      }

      if (membroCPF === atorCPF) {
        throw new ErrorResponse(400, 'Você não pode expulsar a si mesmo — use a ação de sair do grupo');
      }

      // Expulsando o líder: só o criador do projeto pode fazer isso.
      if (membroCPF === grupo.UsuarioCPFLider) {
        if (!ehCriadorDoProjeto) {
          throw new ErrorResponse(403, 'Apenas o criador do projeto pode remover o líder do grupo');
        }

        const proximoLider = await this.#usuarioXGrupoDAO.findMembroMaisAntigo(grupoGUID);

        if (!proximoLider) {
          await this.#grupoProjetoDAO.delete(grupoGUID);
          await connection.commit();

          this.#notificarRemovidoGrupo(projeto.EscolaGUID, projeto.ProjetoTitulo, membroCPF, grupo.GrupoProjetoGUID).catch((error) => {
            console.error('🔴 GrupoProjetoService.#notificarRemovidoGrupo() falhou:', error);
          });

          return { mensagem: 'Líder removido — grupo dissolvido (não havia outros membros)', grupoDissolvido: true };
        }

        await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, proximoLider.UsuarioCPF);
        await this.#grupoProjetoDAO.update(grupoGUID, { UsuarioCPFLider: proximoLider.UsuarioCPF });

        await this.#historicoService.registrar({
          GrupoProjetoGUID: grupoGUID,
          HistoricoTipo: 'Expulsao',
          UsuarioCPFAtor: atorCPF,
          UsuarioCPFAlvo: membroCPF,
          HistoricoDetalhes: { novoLiderCPF: proximoLider.UsuarioCPF }
        });

        await connection.commit();

        this.#notificarRemovidoGrupo(projeto.EscolaGUID, projeto.ProjetoTitulo, membroCPF, grupoGUID).catch((error) => {
          console.error('🔴 GrupoProjetoService.#notificarRemovidoGrupo() falhou:', error);
        });

        return { mensagem: 'Líder removido — liderança transferida ao membro mais antigo', novoLiderCPF: proximoLider.UsuarioCPF };
      }

      // Expulsando um membro comum
      const isMembro = await this.#usuarioXGrupoDAO.isMembroNaoLider(membroCPF, grupoGUID);
      if (!isMembro) {
        throw new ErrorResponse(404, 'Usuário não é membro deste grupo');
      }

      await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, membroCPF);

      await this.#historicoService.registrar({
        GrupoProjetoGUID: grupoGUID,
        HistoricoTipo: 'Expulsao',
        UsuarioCPFAtor: atorCPF,
        UsuarioCPFAlvo: membroCPF
      });

      await connection.commit();

      this.#notificarRemovidoGrupo(projeto.EscolaGUID, projeto.ProjetoTitulo, membroCPF, grupoGUID).catch((error) => {
        console.error('🔴 GrupoProjetoService.#notificarRemovidoGrupo() falhou:', error);
      });

      return { mensagem: 'Membro expulso com sucesso' };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };

  /** Notifica o membro removido (tipo `removido_grupo_projeto`) */
  #notificarRemovidoGrupo = async (
    escolaGUID: string,
    projetoTitulo: string,
    membroCPF: string,
    grupoGUID: string
  ): Promise<void> => {
    await getNotificacaoService().disparar({
      tipoSlug: 'removido_grupo_projeto',
      destinatarios: [membroCPF],
      escolaGUID,
      titulo: `Você foi removido do grupo do projeto "${projetoTitulo}"`,
      entidadeTipo: 'grupoprojeto',
      entidadeGUID: grupoGUID
    });
  };

  /**
   * TRANSFERIR LIDERANÇA — apenas o líder atual
   */
  transferirLideranca = async (
    grupoGUID: string,
    novoLiderCPF: string,
    liderAtualCPF: string
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

      if (grupo.UsuarioCPFLider !== liderAtualCPF) {
        throw new ErrorResponse(403, 'Apenas o líder pode transferir a liderança');
      }

      const isMembroNaoLider = await this.#usuarioXGrupoDAO.isMembroNaoLider(novoLiderCPF, grupoGUID);
      if (!isMembroNaoLider) {
        throw new ErrorResponse(400, 'Novo líder deve ser um membro do grupo');
      }

      await this.#usuarioXGrupoDAO.deleteByGrupoAndUsuario(grupoGUID, novoLiderCPF);
      await this.#usuarioXGrupoDAO.create({ GrupoProjetoGUID: grupoGUID, UsuarioCPF: liderAtualCPF });
      await this.#grupoProjetoDAO.update(grupoGUID, { UsuarioCPFLider: novoLiderCPF });

      await this.#historicoService.registrar({
        GrupoProjetoGUID: grupoGUID,
        HistoricoTipo: 'TransferenciaLider',
        UsuarioCPFAtor: liderAtualCPF,
        UsuarioCPFAlvo: novoLiderCPF
      });

      await connection.commit();

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
    usuarioCPF: string
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

    if (projeto.UsuarioCPFCriador !== usuarioCPF) {
      throw new ErrorResponse(403, 'Apenas o criador do projeto pode atribuir pontuação');
    }

    await this.#grupoProjetoDAO.atualizarPontuacao(grupoGUID, pontuacao);

    await this.#historicoService.registrar({
      GrupoProjetoGUID: grupoGUID,
      HistoricoTipo: 'PontuacaoAtribuida',
      UsuarioCPFAtor: usuarioCPF,
      HistoricoDetalhes: { pontuacao }
    });

    const destinatarios = grupo.Membros.map((m) => m.UsuarioCPF);
    getNotificacaoService().disparar({
      tipoSlug: 'projeto_pontuacao_atribuida',
      destinatarios,
      escolaGUID: projeto.EscolaGUID,
      titulo: `Seu grupo recebeu pontuação no projeto "${projeto.ProjetoTitulo}"`,
      entidadeTipo: 'grupoprojeto',
      entidadeGUID: grupoGUID
    }).catch((error) => {
      console.error('🔴 GrupoProjetoService.atualizarPontuacao() falhou ao notificar:', error);
    });

    return { mensagem: 'Pontuação atribuída com sucesso' };
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
