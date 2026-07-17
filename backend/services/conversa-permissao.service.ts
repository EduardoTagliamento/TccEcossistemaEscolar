import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { TurmaDAO } from '../repositories/turma.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../repositories/escolaxusuarioxfuncao.repository';
import ErrorResponse from '../utils/ErrorResponse';

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
  }
}
