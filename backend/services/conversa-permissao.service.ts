import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { TurmaDAO } from '../repositories/turma.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import ErrorResponse from '../utils/ErrorResponse';
import { RowDataPacket } from 'mysql2';
import { pool } from '../database/mysql';
import { getNotificacaoService } from './notificacao.service';

export default class ConversaPermissaoService {
  #conversaGrupoDAO: ConversaGrupoDAO;
  #turmaDAO: TurmaDAO;
  #escolaFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    conversaGrupoDAO: ConversaGrupoDAO,
    turmaDAO: TurmaDAO,
    escolaFuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log('⬆️  ConversaPermissaoService.constructor()');
    this.#conversaGrupoDAO = conversaGrupoDAO;
    this.#turmaDAO = turmaDAO;
    this.#escolaFuncaoDAO = escolaFuncaoDAO;
  }

  async #assertCoordOuDirecao(conversaGUID: string, solicitanteCPF: string): Promise<void> {
    const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
    if (!grupo || grupo.ConversaGrupoTipo !== 'Turma') {
      throw new ErrorResponse(400, 'Esta operação é exclusiva para grupos de Turma');
    }
    const turma = await this.#turmaDAO.findById(grupo.ConversaGrupoRefGUID);
    if (!turma) throw new ErrorResponse(404, 'Turma não encontrada');
    const autorizado = await this.#escolaFuncaoDAO.isCoordOuDirecaoEmEscola(
      solicitanteCPF,
      turma.EscolaGUID
    );
    if (!autorizado) {
      throw new ErrorResponse(403, 'Apenas Coordenação ou Direção pode realizar esta operação');
    }
  }

  async #assertRepresentanteOuLider(conversaGUID: string, solicitanteCPF: string): Promise<void> {
    const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
    if (!grupo) throw new ErrorResponse(404, 'Conversa não encontrada');

    const funcao = await this.#conversaGrupoDAO.getFuncao(conversaGUID, solicitanteCPF);
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

  // Turma only: Coordenação/Direção define o Representante
  async definirRepresentante(conversaGUID: string, alvoCPF: string, solicitanteCPF: string): Promise<void> {
    console.log('🟣 ConversaPermissaoService.definirRepresentante()');
    await this.#assertCoordOuDirecao(conversaGUID, solicitanteCPF);

    const isMembro = await this.#conversaGrupoDAO.isMembro(conversaGUID, alvoCPF);
    if (!isMembro) throw new ErrorResponse(400, 'Usuário não é membro desta conversa');

    const atual = await this.#conversaGrupoDAO.findByFuncao(conversaGUID, 'Representante');
    if (atual) {
      await this.#conversaGrupoDAO.setFuncao(conversaGUID, atual.MembroUsuarioCPF, 'Membro');
      const vices = await this.#conversaGrupoDAO.findAllByFuncao(conversaGUID, 'Vice-Representante');
      for (const v of vices) {
        await this.#conversaGrupoDAO.setFuncao(conversaGUID, v.MembroUsuarioCPF, 'Membro');
      }
    }

    await this.#conversaGrupoDAO.setFuncao(conversaGUID, alvoCPF, 'Representante');

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioCPF: alvoCPF,
      NovaFuncao: 'Representante',
    });

    this.#notificarPromocao(conversaGUID, alvoCPF, 'promovido_representante', 'Você foi promovido a representante da turma').catch((error) => {
      console.error('🔴 ConversaPermissaoService.#notificarPromocao() falhou:', error);
    });
  }

  // Turma only: Coordenação/Direção remove o Representante
  async removerRepresentante(conversaGUID: string, solicitanteCPF: string): Promise<void> {
    console.log('🟣 ConversaPermissaoService.removerRepresentante()');
    await this.#assertCoordOuDirecao(conversaGUID, solicitanteCPF);

    const representante = await this.#conversaGrupoDAO.findByFuncao(conversaGUID, 'Representante');
    if (!representante) throw new ErrorResponse(404, 'Não há Representante nesta conversa');

    await this.#conversaGrupoDAO.setFuncao(conversaGUID, representante.MembroUsuarioCPF, 'Membro');

    const vices = await this.#conversaGrupoDAO.findAllByFuncao(conversaGUID, 'Vice-Representante');
    for (const v of vices) {
      await this.#conversaGrupoDAO.setFuncao(conversaGUID, v.MembroUsuarioCPF, 'Membro');
    }

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioCPF: representante.MembroUsuarioCPF,
      NovaFuncao: 'Membro',
    });
  }

  // Turma: Representante delega; Tarefa: Lider delega
  async definirViceRepresentante(conversaGUID: string, alvoCPF: string, solicitanteCPF: string): Promise<void> {
    console.log('🟣 ConversaPermissaoService.definirViceRepresentante()');
    await this.#assertRepresentanteOuLider(conversaGUID, solicitanteCPF);

    const isMembro = await this.#conversaGrupoDAO.isMembro(conversaGUID, alvoCPF);
    if (!isMembro) throw new ErrorResponse(400, 'Usuário não é membro desta conversa');

    const funcaoAtual = await this.#conversaGrupoDAO.getFuncao(conversaGUID, alvoCPF);
    if (funcaoAtual === 'Lider' || funcaoAtual === 'Representante') {
      throw new ErrorResponse(400, 'Líder ou Representante não pode ser Vice-Representante');
    }

    await this.#conversaGrupoDAO.setFuncao(conversaGUID, alvoCPF, 'Vice-Representante');

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioCPF: alvoCPF,
      NovaFuncao: 'Vice-Representante',
    });

    this.#notificarPromocao(conversaGUID, alvoCPF, 'promovido_vice_representante', 'Você foi promovido a vice-representante').catch((error) => {
      console.error('🔴 ConversaPermissaoService.#notificarPromocao() falhou:', error);
    });
  }

  // Turma: Representante remove; Tarefa: Lider remove
  async removerViceRepresentante(conversaGUID: string, alvoCPF: string, solicitanteCPF: string): Promise<void> {
    console.log('🟣 ConversaPermissaoService.removerViceRepresentante()');
    await this.#assertRepresentanteOuLider(conversaGUID, solicitanteCPF);

    const funcaoAtual = await this.#conversaGrupoDAO.getFuncao(conversaGUID, alvoCPF);
    if (funcaoAtual !== 'Vice-Representante') {
      throw new ErrorResponse(400, 'Usuário não é Vice-Representante desta conversa');
    }

    await this.#conversaGrupoDAO.setFuncao(conversaGUID, alvoCPF, 'Membro');

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'permissao_atualizada', {
      ConversaGUID: conversaGUID,
      UsuarioCPF: alvoCPF,
      NovaFuncao: 'Membro',
    });

    this.#notificarPromocao(conversaGUID, alvoCPF, 'removido_vice_representante', 'Você foi removido do cargo de vice-representante').catch((error) => {
      console.error('🔴 ConversaPermissaoService.#notificarPromocao() falhou:', error);
    });
  }

  /** Resolve o EscolaGUID de um grupo (Turma direto, Tarefa via grupotarefa) e dispara a notificação de mudança de papel */
  #notificarPromocao = async (conversaGUID: string, alvoCPF: string, tipoSlug: string, titulo: string): Promise<void> => {
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

    await getNotificacaoService().disparar({
      tipoSlug,
      destinatarios: [alvoCPF],
      escolaGUID,
      titulo,
      entidadeTipo: 'conversagrupo',
      entidadeGUID: conversaGUID,
    });
  };
}
