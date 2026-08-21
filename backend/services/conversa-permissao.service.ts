import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { TurmaDAO } from '../repositories/turma.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import { UsuarioDAO } from '../repositories/usuario.repository';
import ErrorResponse from '../utils/ErrorResponse';
import { RowDataPacket } from 'mysql2';
import { pool } from '../database/mysql';
import { getNotificacaoService } from './notificacao.service';
import R2StorageService from './r2storage.service';
import { extrairCorDominante } from '../utils/helpers/cor-imagem.helper';
import { resolverPermissaoChat } from '../utils/helpers/permissao-granular.helper';

export interface MembrosTurmaDTO {
  ConversaGUID: string;
  ConversaGrupoRefGUID: string;
  Membros: Array<{ UsuarioGUID: string; UsuarioNome: string; MembroFuncao: string; MembroEntradaAt: string }>;
}

export interface ConversaGrupoDTO {
  ConversaGUID: string;
  ConversaGrupoNome: string;
  ConversaGrupoTipo: 'Turma' | 'Tarefa';
  ConversaGrupoCorFundo: string | null;
  ConversaGrupoImagemUrl: string | null;
}

export default class ConversaPermissaoService {
  #conversaGrupoDAO: ConversaGrupoDAO;
  #turmaDAO: TurmaDAO;
  #escolaFuncaoDAO: EscolaxUsuarioxFuncaoDAO;
  #usuarioDAO: UsuarioDAO;

  constructor(
    conversaGrupoDAO: ConversaGrupoDAO,
    turmaDAO: TurmaDAO,
    escolaFuncaoDAO: EscolaxUsuarioxFuncaoDAO,
    usuarioDAO: UsuarioDAO
  ) {
    console.log('⬆️  ConversaPermissaoService.constructor()');
    this.#conversaGrupoDAO = conversaGrupoDAO;
    this.#turmaDAO = turmaDAO;
    this.#escolaFuncaoDAO = escolaFuncaoDAO;
    this.#usuarioDAO = usuarioDAO;
  }

  // escolaxusuarioxfuncao já usa UsuarioGUID.
  async #assertCoordOuDirecao(conversaGUID: string, solicitanteGUID: string): Promise<void> {
    const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
    if (!grupo || grupo.ConversaGrupoTipo !== 'Turma') {
      throw new ErrorResponse(400, 'Esta operação é exclusiva para grupos de Turma');
    }
    const turma = await this.#turmaDAO.findById(grupo.ConversaGrupoRefGUID);
    if (!turma) throw new ErrorResponse(404, 'Turma não encontrada');
    const autorizado = await this.#escolaFuncaoDAO.isCoordOuDirecaoEmEscola(
      solicitanteGUID,
      turma.EscolaGUID
    );
    if (!autorizado) {
      throw new ErrorResponse(403, 'Apenas Coordenação ou Direção pode realizar esta operação');
    }
  }

  async #assertRepresentanteOuLider(conversaGUID: string, solicitanteGUID: string): Promise<void> {
    const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
    if (!grupo) throw new ErrorResponse(404, 'Conversa não encontrada');

    const funcao = await this.#conversaGrupoDAO.getFuncao(conversaGUID, solicitanteGUID);
    if (grupo.ConversaGrupoTipo === 'Turma') {
      if (funcao !== 'Representante') {
        throw new ErrorResponse(403, 'Apenas o Representante pode delegar Vice-Representante neste grupo');
      }
    } else {
      if (funcao !== 'Lider') {
        throw new ErrorResponse(403, 'Apenas o Líder pode delegar Vice-Representante neste grupo');
      }
    }
  }

  /** Resolve o EscolaGUID de um grupo (Turma direto, Tarefa via grupotarefa) — mesma consulta usada em #notificarPromocao. */
  async #resolverEscolaGUID(grupo: { ConversaGrupoTipo: 'Turma' | 'Tarefa'; ConversaGrupoRefGUID: string }): Promise<string | null> {
    const [rows] = await pool.execute<RowDataPacket[]>(
      grupo.ConversaGrupoTipo === 'Turma'
        ? `SELECT EscolaGUID FROM turma WHERE TurmaGUID = ? LIMIT 1`
        : `SELECT t.EscolaGUID FROM grupotarefa gt INNER JOIN turma t ON t.TurmaGUID = gt.TurmaGUID WHERE gt.GrupoTarefaGUID = ? LIMIT 1`,
      [grupo.ConversaGrupoRefGUID]
    );
    return (rows[0] as any)?.EscolaGUID ?? null;
  }

  /**
   * Quem pode personalizar (nome/cor/foto) o grupo: quem tem a capacidade
   * PodePersonalizarGrupo (papel padrão Representante/Vice-Representante em
   * Turma, Lider em Tarefa, ou concedida individualmente) — ou, como
   * fallback administrativo, Coordenação/Direção da escola (só se aplica a
   * grupos de Turma, mesmo padrão da capa da turma).
   */
  async #assertPermissaoPersonalizarGrupo(conversaGUID: string, solicitanteGUID: string): Promise<{ grupo: NonNullable<Awaited<ReturnType<ConversaGrupoDAO['findByConversaGUID']>>> }> {
    const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
    if (!grupo) throw new ErrorResponse(404, 'Conversa não encontrada');

    const membro = await this.#conversaGrupoDAO.findMembro(conversaGUID, solicitanteGUID);
    const podePersonalizar = resolverPermissaoChat(
      membro?.MembroFuncao ?? null,
      membro?.MembroPermissoes,
      grupo.ConversaGrupoTipo,
      'PodePersonalizarGrupo'
    );
    if (podePersonalizar) return { grupo };

    const escolaGUID = await this.#resolverEscolaGUID(grupo);
    if (escolaGUID) {
      const autorizado = await this.#escolaFuncaoDAO.isCoordOuDirecaoEmEscola(solicitanteGUID, escolaGUID);
      if (autorizado) return { grupo };
    }

    throw new ErrorResponse(403, 'Você não tem permissão para personalizar este grupo');
  }

  /** Personalização do grupo (nome/cor/foto) — Turma e Tarefa (Projeto não tem grupo de chat). */
  async atualizarPersonalizacao(
    conversaGUID: string,
    usuarioGUID: string,
    dados: { nome?: string; cor?: string; imagem?: { buffer: Buffer; mimetype: string } }
  ): Promise<ConversaGrupoDTO> {
    console.log('🟣 ConversaPermissaoService.atualizarPersonalizacao()');

    const { grupo } = await this.#assertPermissaoPersonalizarGrupo(conversaGUID, usuarioGUID);

    const updates: { ConversaGrupoNome?: string; ConversaGrupoCorFundo?: string; ConversaGrupoImagemUrl?: string } = {};

    if (dados.nome !== undefined) {
      updates.ConversaGrupoNome = dados.nome;
    }

    if (dados.imagem) {
      const extensao = dados.imagem.mimetype.split('/')[1] || 'jpg';
      const chave = `conversas/${conversaGUID}/capa-${Date.now()}.${extensao}`;
      const novaUrl = await R2StorageService.upload(chave, dados.imagem.buffer, dados.imagem.mimetype);

      if (grupo.ConversaGrupoImagemUrl) {
        R2StorageService.removeByUrl(grupo.ConversaGrupoImagemUrl).catch((erro) =>
          console.error('Erro ao remover imagem antiga do grupo:', erro)
        );
      }

      updates.ConversaGrupoImagemUrl = novaUrl;
      updates.ConversaGrupoCorFundo = dados.cor || (await extrairCorDominante(dados.imagem.buffer));
    } else if (dados.cor) {
      updates.ConversaGrupoCorFundo = dados.cor;
    }

    await this.#conversaGrupoDAO.atualizarPersonalizacao(conversaGUID, updates);

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'grupo_personalizado', {
      ConversaGUID: conversaGUID,
      ConversaGrupoNome: updates.ConversaGrupoNome ?? grupo.ConversaGrupoNome,
      ConversaGrupoCorFundo: updates.ConversaGrupoCorFundo ?? grupo.ConversaGrupoCorFundo,
      ConversaGrupoImagemUrl: updates.ConversaGrupoImagemUrl ?? grupo.ConversaGrupoImagemUrl,
    });

    const atualizado = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
    return {
      ConversaGUID: conversaGUID,
      ConversaGrupoNome: atualizado?.ConversaGrupoNome ?? grupo.ConversaGrupoNome,
      ConversaGrupoTipo: grupo.ConversaGrupoTipo,
      ConversaGrupoCorFundo: atualizado?.ConversaGrupoCorFundo ?? null,
      ConversaGrupoImagemUrl: atualizado?.ConversaGrupoImagemUrl ?? null,
    };
  }

  /**
   * Conceder/revogar capacidades granulares a um membro específico — só
   * quem já tem autoridade "de origem" (Representante em Turma, Lider em
   * Tarefa) pode conceder; um membro delegado nunca pode conceder permissão
   * a outro (mesmo gate estrito de #assertRepresentanteOuLider, reusado).
   */
  async atualizarPermissaoMembro(
    conversaGUID: string,
    alvoGUID: string,
    patch: Record<string, boolean>,
    solicitanteGUID: string
  ): Promise<void> {
    console.log('🟣 ConversaPermissaoService.atualizarPermissaoMembro()');

    await this.#assertRepresentanteOuLider(conversaGUID, solicitanteGUID);

    const isMembro = await this.#conversaGrupoDAO.isMembro(conversaGUID, alvoGUID);
    if (!isMembro) throw new ErrorResponse(400, 'Usuário não é membro desta conversa');

    await this.#conversaGrupoDAO.atualizarPermissaoMembro(conversaGUID, alvoGUID, patch);

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_membro_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioGUID: alvoGUID,
      Permissoes: patch,
    });
  }

  /**
   * Lista os membros do grupo de UMA turma pra Coordenação/Direção poder
   * escolher o Representante fora do chat (Gestão de Dados → Turmas) — sem
   * isso, só quem já é membro do grupo (aluno) consegue ver essa lista via
   * buscarConversa (que exige isParticipante).
   */
  async listarMembrosPorTurma(turmaGUID: string, solicitanteGUID: string): Promise<MembrosTurmaDTO> {
    console.log('🟣 ConversaPermissaoService.listarMembrosPorTurma()');

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) throw new ErrorResponse(404, 'Turma não encontrada');

    const autorizado = await this.#escolaFuncaoDAO.isCoordOuDirecaoEmEscola(solicitanteGUID, turma.EscolaGUID);
    if (!autorizado) {
      throw new ErrorResponse(403, 'Apenas Coordenação ou Direção pode ver os membros do grupo desta turma');
    }

    const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
    if (!grupo || grupo.ConversaGrupoTipo !== 'Turma') {
      throw new ErrorResponse(404, 'Esta turma ainda não tem grupo de conversa');
    }

    const membros = await this.#conversaGrupoDAO.findMembrosComNome(grupo.ConversaGUID);

    return {
      ConversaGUID: grupo.ConversaGUID,
      ConversaGrupoRefGUID: turmaGUID,
      Membros: membros.map((m) => ({
        UsuarioGUID: m.MembroUsuarioGUID,
        UsuarioNome: m.UsuarioNome,
        MembroFuncao: m.MembroFuncao,
        MembroEntradaAt: m.MembroEntradaAt.toISOString(),
      })),
    };
  }

  // Turma only: Coordenação/Direção define o Representante
  async definirRepresentante(conversaGUID: string, alvoGUID: string, solicitanteGUID: string): Promise<void> {
    console.log('🟣 ConversaPermissaoService.definirRepresentante()');
    await this.#assertCoordOuDirecao(conversaGUID, solicitanteGUID);

    const isMembro = await this.#conversaGrupoDAO.isMembro(conversaGUID, alvoGUID);
    if (!isMembro) throw new ErrorResponse(400, 'Usuário não é membro desta conversa');

    const atual = await this.#conversaGrupoDAO.findByFuncao(conversaGUID, 'Representante');
    if (atual) {
      await this.#conversaGrupoDAO.setFuncao(conversaGUID, atual.MembroUsuarioGUID, 'Membro');
      const vices = await this.#conversaGrupoDAO.findAllByFuncao(conversaGUID, 'Vice-Representante');
      for (const v of vices) {
        await this.#conversaGrupoDAO.setFuncao(conversaGUID, v.MembroUsuarioGUID, 'Membro');
      }
    }

    await this.#conversaGrupoDAO.setFuncao(conversaGUID, alvoGUID, 'Representante');

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioGUID: alvoGUID,
      NovaFuncao: 'Representante',
    });

    this.#notificarPromocao(conversaGUID, alvoGUID, 'promovido_representante', 'Você foi promovido(a) a representante da turma').catch((error) => {
      console.error('🔴 ConversaPermissaoService.#notificarPromocao() falhou:', error);
    });
  }

  // Turma only: Coordenação/Direção remove o Representante
  async removerRepresentante(conversaGUID: string, solicitanteGUID: string): Promise<void> {
    console.log('🟣 ConversaPermissaoService.removerRepresentante()');
    await this.#assertCoordOuDirecao(conversaGUID, solicitanteGUID);

    const representante = await this.#conversaGrupoDAO.findByFuncao(conversaGUID, 'Representante');
    if (!representante) throw new ErrorResponse(404, 'Não há Representante nesta conversa');

    await this.#conversaGrupoDAO.setFuncao(conversaGUID, representante.MembroUsuarioGUID, 'Membro');

    const vices = await this.#conversaGrupoDAO.findAllByFuncao(conversaGUID, 'Vice-Representante');
    for (const v of vices) {
      await this.#conversaGrupoDAO.setFuncao(conversaGUID, v.MembroUsuarioGUID, 'Membro');
    }

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioGUID: representante.MembroUsuarioGUID,
      NovaFuncao: 'Membro',
    });
  }

  // Turma: Representante delega; Tarefa: Lider delega
  async definirViceRepresentante(conversaGUID: string, alvoGUID: string, solicitanteGUID: string): Promise<void> {
    console.log('🟣 ConversaPermissaoService.definirViceRepresentante()');
    await this.#assertRepresentanteOuLider(conversaGUID, solicitanteGUID);

    const isMembro = await this.#conversaGrupoDAO.isMembro(conversaGUID, alvoGUID);
    if (!isMembro) throw new ErrorResponse(400, 'Usuário não é membro desta conversa');

    const funcaoAtual = await this.#conversaGrupoDAO.getFuncao(conversaGUID, alvoGUID);
    if (funcaoAtual === 'Lider' || funcaoAtual === 'Representante') {
      throw new ErrorResponse(400, 'Líder ou Representante não pode ser Vice-Representante');
    }

    await this.#conversaGrupoDAO.setFuncao(conversaGUID, alvoGUID, 'Vice-Representante');

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioGUID: alvoGUID,
      NovaFuncao: 'Vice-Representante',
    });

    this.#notificarPromocao(conversaGUID, alvoGUID, 'promovido_vice_representante', 'Você foi promovido(a) a vice-representante').catch((error) => {
      console.error('🔴 ConversaPermissaoService.#notificarPromocao() falhou:', error);
    });
  }

  // Turma: Representante remove; Tarefa: Lider remove
  async removerViceRepresentante(conversaGUID: string, alvoGUID: string, solicitanteGUID: string): Promise<void> {
    console.log('🟣 ConversaPermissaoService.removerViceRepresentante()');
    await this.#assertRepresentanteOuLider(conversaGUID, solicitanteGUID);

    const funcaoAtual = await this.#conversaGrupoDAO.getFuncao(conversaGUID, alvoGUID);
    if (funcaoAtual !== 'Vice-Representante') {
      throw new ErrorResponse(400, 'Usuário não é Vice-Representante desta conversa');
    }

    await this.#conversaGrupoDAO.setFuncao(conversaGUID, alvoGUID, 'Membro');

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioGUID: alvoGUID,
      NovaFuncao: 'Membro',
    });

    this.#notificarPromocao(conversaGUID, alvoGUID, 'removido_vice_representante', 'Você foi removido(a) do cargo de vice-representante').catch((error) => {
      console.error('🔴 ConversaPermissaoService.#notificarPromocao() falhou:', error);
    });
  }

  /** Resolve o EscolaGUID de um grupo (Turma direto, Tarefa via grupotarefa) e dispara a notificação de mudança de papel */
  #notificarPromocao = async (conversaGUID: string, alvoGUID: string, tipoSlug: string, titulo: string): Promise<void> => {
    const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
    if (!grupo) return;

    const [rows] = await pool.execute<RowDataPacket[]>(
      grupo.ConversaGrupoTipo === 'Turma'
        ? `SELECT EscolaGUID FROM turma WHERE TurmaGUID = ? LIMIT 1`
        : `SELECT t.EscolaGUID FROM grupotarefa gt INNER JOIN turma t ON t.TurmaGUID = gt.TurmaGUID WHERE gt.GrupoTarefaGUID = ? LIMIT 1`,
      [grupo.ConversaGrupoRefGUID]
    );
    const escolaGUID = (rows[0] as any)?.EscolaGUID;
    if (!escolaGUID) return;

    const alvo = await this.#usuarioDAO.findByGUID(alvoGUID);
    if (!alvo) return;

    await getNotificacaoService().disparar({
      tipoSlug,
      destinatarios: [alvo.UsuarioGUID],
      escolaGUID,
      titulo,
      entidadeTipo: 'conversagrupo',
      entidadeGUID: conversaGUID,
      link: `/dashboard/${escolaGUID}/chat?conversa=${conversaGUID}`,
    });
  };
}
