import { v4 as uuidv4 } from 'uuid';
import { ConversaDAO } from '../repositories/conversa.repository';
import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';

export default class ConversaGrupoService {
  #conversaDAO: ConversaDAO;
  #conversaGrupoDAO: ConversaGrupoDAO;
  #matriculaDAO: MatriculaDAO;

  constructor(
    conversaDAO: ConversaDAO,
    conversaGrupoDAO: ConversaGrupoDAO,
    matriculaDAO: MatriculaDAO
  ) {
    console.log('⬆️  ConversaGrupoService.constructor()');
    this.#conversaDAO = conversaDAO;
    this.#conversaGrupoDAO = conversaGrupoDAO;
    this.#matriculaDAO = matriculaDAO;
  }

  /**
   * Papel do usuário no grupo de chat da turma (Representante/Vice-Representante
   * etc.) — usado pelo módulo Matérias pra decidir quem pode trocar a capa/cor
   * da turma. Retorna null se o usuário não é membro ou a turma não tem grupo.
   */
  async getFuncaoNaTurma(turmaGUID: string, usuarioCPF: string): Promise<'Membro' | 'Lider' | 'Representante' | 'Vice-Representante' | null> {
    console.log('🟣 ConversaGrupoService.getFuncaoNaTurma()');
    const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
    if (!grupo) return null;
    return this.#conversaGrupoDAO.getFuncao(grupo.ConversaGUID, usuarioCPF);
  }

  // Chamado após criação de uma Turma
  async criarGrupoTurma(turmaGUID: string, turmaNome: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.criarGrupoTurma()');
    try {
      const conversaGUID = uuidv4();
      await this.#conversaDAO.create(conversaGUID, 'Grupo');
      await this.#conversaGrupoDAO.createGrupo(conversaGUID, turmaNome, 'Turma', turmaGUID);

      // Popula membros com matrículas ativas da turma
      const matriculas = await this.#matriculaDAO.findAll({
        TurmaGUID: turmaGUID,
        MatriculaStatus: 'Ativa',
      });
      for (const m of matriculas) {
        await this.#conversaGrupoDAO.addMembro(conversaGUID, m.UsuarioCPF);
      }
      console.log(`✅ Grupo de turma criado: ${turmaNome} (${conversaGUID}) com ${matriculas.length} membros`);
    } catch (err) {
      console.error('❌ ConversaGrupoService.criarGrupoTurma() falhou:', err);
    }
  }

  // Chamado quando Turma muda de nome
  async sincronizarNomeGrupoTurma(turmaGUID: string, novoNome: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.sincronizarNomeGrupoTurma()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.updateNome(grupo.ConversaGUID, novoNome);
    } catch (err) {
      console.error('❌ ConversaGrupoService.sincronizarNomeGrupoTurma() falhou:', err);
    }
  }

  // Chamado quando Turma é desativada/encerrada
  async encerrarGrupoTurma(turmaGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.encerrarGrupoTurma()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
      if (!grupo) return;
      await this.#conversaDAO.setStatus(grupo.ConversaGUID, 'Inativa');
      // Emite evento WS — importado lazy para evitar dependência circular na inicialização
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'grupo_encerrado', { ConversaGUID: grupo.ConversaGUID });
    } catch (err) {
      console.error('❌ ConversaGrupoService.encerrarGrupoTurma() falhou:', err);
    }
  }

  // Chamado quando nova Matrícula é criada
  async adicionarMembroTurma(turmaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.adicionarMembroTurma()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.addMembro(grupo.ConversaGUID, usuarioCPF);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_entrou', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioCPF: usuarioCPF,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.adicionarMembroTurma() falhou:', err);
    }
  }

  // Chamado quando Matrícula muda para Transferida/Cancelada/Concluida
  async removerMembroTurma(turmaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.removerMembroTurma()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.removeMembro(grupo.ConversaGUID, usuarioCPF);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_saiu', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioCPF: usuarioCPF,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.removerMembroTurma() falhou:', err);
    }
  }

  // Chamado após criação de um GrupoTarefa individual
  async criarConversaParaGrupoTarefa(grupoTarefaGUID: string, nome: string, liderCPF: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.criarConversaParaGrupoTarefa()');
    try {
      const conversaGUID = uuidv4();
      await this.#conversaDAO.create(conversaGUID, 'Grupo');
      await this.#conversaGrupoDAO.createGrupo(conversaGUID, nome, 'Tarefa', grupoTarefaGUID);
      await this.#conversaGrupoDAO.addMembro(conversaGUID, liderCPF);
      await this.#conversaGrupoDAO.setFuncao(conversaGUID, liderCPF, 'Lider');
      console.log(`✅ Conversa para GrupoTarefa criada: ${grupoTarefaGUID} (${conversaGUID})`);
    } catch (err) {
      console.error('❌ ConversaGrupoService.criarConversaParaGrupoTarefa() falhou:', err);
    }
  }

  // Chamado quando membro entra em GrupoTarefa
  async adicionarMembroGrupoTarefa(grupoTarefaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.adicionarMembroGrupoTarefa()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoTarefaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.addMembro(grupo.ConversaGUID, usuarioCPF);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_entrou', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioCPF: usuarioCPF,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.adicionarMembroGrupoTarefa() falhou:', err);
    }
  }

  // Chamado quando membro é removido/expulso de GrupoTarefa
  async removerMembroGrupoTarefa(grupoTarefaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.removerMembroGrupoTarefa()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoTarefaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.removeMembro(grupo.ConversaGUID, usuarioCPF);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_saiu', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioCPF: usuarioCPF,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.removerMembroGrupoTarefa() falhou:', err);
    }
  }

  // Chamado quando liderança é transferida em GrupoTarefa
  async transferirLiderGrupoTarefa(
    grupoTarefaGUID: string,
    antigoLiderCPF: string,
    novoLiderCPF: string
  ): Promise<void> {
    console.log('🟣 ConversaGrupoService.transferirLiderGrupoTarefa()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoTarefaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.setFuncao(grupo.ConversaGUID, antigoLiderCPF, 'Membro');
      await this.#conversaGrupoDAO.setFuncao(grupo.ConversaGUID, novoLiderCPF, 'Lider');
    } catch (err) {
      console.error('❌ ConversaGrupoService.transferirLiderGrupoTarefa() falhou:', err);
    }
  }

  // Chamado pelo CleanupScheduler diariamente
  async encerrarGruposTarefasExpiradas(): Promise<number> {
    console.log('🟣 ConversaGrupoService.encerrarGruposTarefasExpiradas()');
    const expirados = await this.#conversaGrupoDAO.findGruposTarefasExpirados();
    const { SocketServer } = await import('../websocket/SocketServer');

    for (const grupo of expirados) {
      await this.#conversaDAO.setStatus(grupo.ConversaGUID, 'Inativa');
      SocketServer.emit(grupo.ConversaGUID, 'grupo_encerrado', { ConversaGUID: grupo.ConversaGUID });
    }
    return expirados.length;
  }
}
