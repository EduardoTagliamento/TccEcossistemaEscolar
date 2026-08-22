import { gerarGUID } from "../utils/helpers/guid.helper";
import { ConversaDAO } from '../repositories/conversa.repository';
import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { MatriculaDAO } from '../repositories/matricula.repository';
import { UsuarioDAO } from '../repositories/usuario.repository';

export default class ConversaGrupoService {
  #conversaDAO: ConversaDAO;
  #conversaGrupoDAO: ConversaGrupoDAO;
  #matriculaDAO: MatriculaDAO;
  #usuarioDAO: UsuarioDAO;

  constructor(
    conversaDAO: ConversaDAO,
    conversaGrupoDAO: ConversaGrupoDAO,
    matriculaDAO: MatriculaDAO,
    usuarioDAO: UsuarioDAO
  ) {
    console.log('⬆️  ConversaGrupoService.constructor()');
    this.#conversaDAO = conversaDAO;
    this.#conversaGrupoDAO = conversaGrupoDAO;
    this.#matriculaDAO = matriculaDAO;
    this.#usuarioDAO = usuarioDAO;
  }

  /**
   * Papel do usuário no grupo de chat da turma (Representante/Vice-Representante
   * etc.) — usado pelo módulo Matérias pra decidir quem pode trocar a capa/cor
   * da turma. Retorna null se o usuário não é membro ou a turma não tem grupo.
   */
  async getFuncaoNaTurma(turmaGUID: string, usuarioGUID: string): Promise<'Membro' | 'Lider' | 'Representante' | 'Vice-Representante' | null> {
    console.log('🟣 ConversaGrupoService.getFuncaoNaTurma()');
    const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
    if (!grupo) return null;
    return this.#conversaGrupoDAO.getFuncao(grupo.ConversaGUID, usuarioGUID);
  }

  // Chamado após criação de uma Turma
  async criarGrupoTurma(turmaGUID: string, turmaNome: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.criarGrupoTurma()');
    try {
      const conversaGUID = gerarGUID();
      await this.#conversaDAO.create(conversaGUID, 'Grupo');
      await this.#conversaGrupoDAO.createGrupo(conversaGUID, turmaNome, 'Turma', turmaGUID);

      // Popula membros com matrículas ativas da turma — matricula.UsuarioGUID
      // já é a identidade real do aluno, sem resolução nenhuma necessária.
      const matriculas = await this.#matriculaDAO.findAll({
        TurmaGUID: turmaGUID,
        MatriculaStatus: 'Ativa',
      });
      for (const m of matriculas) {
        await this.#conversaGrupoDAO.addMembro(conversaGUID, m.UsuarioGUID);
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
  async adicionarMembroTurma(turmaGUID: string, usuarioGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.adicionarMembroTurma()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.addMembro(grupo.ConversaGUID, usuarioGUID);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_entrou', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioGUID: usuarioGUID,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.adicionarMembroTurma() falhou:', err);
    }
  }

  // Chamado quando Matrícula muda para Transferida/Cancelada/Concluida
  async removerMembroTurma(turmaGUID: string, usuarioGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.removerMembroTurma()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(turmaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.removeMembro(grupo.ConversaGUID, usuarioGUID);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_saiu', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioGUID: usuarioGUID,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.removerMembroTurma() falhou:', err);
    }
  }

  // Chamado após criação de um GrupoTarefa individual
  async criarConversaParaGrupoTarefa(grupoTarefaGUID: string, nome: string, liderGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.criarConversaParaGrupoTarefa()');
    try {
      const conversaGUID = gerarGUID();
      await this.#conversaDAO.create(conversaGUID, 'Grupo');
      await this.#conversaGrupoDAO.createGrupo(conversaGUID, nome, 'Tarefa', grupoTarefaGUID);
      await this.#conversaGrupoDAO.addMembro(conversaGUID, liderGUID);
      await this.#conversaGrupoDAO.setFuncao(conversaGUID, liderGUID, 'Lider');
      console.log(`✅ Conversa para GrupoTarefa criada: ${grupoTarefaGUID} (${conversaGUID})`);
    } catch (err) {
      console.error('❌ ConversaGrupoService.criarConversaParaGrupoTarefa() falhou:', err);
    }
  }

  // Chamado quando membro entra em GrupoTarefa
  async adicionarMembroGrupoTarefa(grupoTarefaGUID: string, usuarioGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.adicionarMembroGrupoTarefa()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoTarefaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.addMembro(grupo.ConversaGUID, usuarioGUID);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_entrou', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioGUID: usuarioGUID,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.adicionarMembroGrupoTarefa() falhou:', err);
    }
  }

  // Chamado quando membro é removido/expulso de GrupoTarefa
  async removerMembroGrupoTarefa(grupoTarefaGUID: string, usuarioGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.removerMembroGrupoTarefa()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoTarefaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.removeMembro(grupo.ConversaGUID, usuarioGUID);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_saiu', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioGUID: usuarioGUID,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.removerMembroGrupoTarefa() falhou:', err);
    }
  }

  // Chamado quando liderança é transferida em GrupoTarefa
  async transferirLiderGrupoTarefa(
    grupoTarefaGUID: string,
    antigoLiderGUID: string,
    novoLiderGUID: string
  ): Promise<void> {
    console.log('🟣 ConversaGrupoService.transferirLiderGrupoTarefa()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoTarefaGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.setFuncao(grupo.ConversaGUID, antigoLiderGUID, 'Membro');
      await this.#conversaGrupoDAO.setFuncao(grupo.ConversaGUID, novoLiderGUID, 'Lider');
    } catch (err) {
      console.error('❌ ConversaGrupoService.transferirLiderGrupoTarefa() falhou:', err);
    }
  }

  // Chamado após criação de um GrupoProjeto individual — mesmo padrão de
  // criarConversaParaGrupoTarefa, ver docs/PLANO_IMPLEMENTACAO_PERMISSOES_GRANULARES_GRUPOS.md, seção 1b.
  async criarConversaParaGrupoProjeto(grupoProjetoGUID: string, nome: string, liderGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.criarConversaParaGrupoProjeto()');
    try {
      const conversaGUID = gerarGUID();
      await this.#conversaDAO.create(conversaGUID, 'Grupo');
      await this.#conversaGrupoDAO.createGrupo(conversaGUID, nome, 'Projeto', grupoProjetoGUID);
      await this.#conversaGrupoDAO.addMembro(conversaGUID, liderGUID);
      await this.#conversaGrupoDAO.setFuncao(conversaGUID, liderGUID, 'Lider');
      console.log(`✅ Conversa para GrupoProjeto criada: ${grupoProjetoGUID} (${conversaGUID})`);
    } catch (err) {
      console.error('❌ ConversaGrupoService.criarConversaParaGrupoProjeto() falhou:', err);
    }
  }

  // Chamado quando membro entra em GrupoProjeto
  async adicionarMembroGrupoProjeto(grupoProjetoGUID: string, usuarioGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.adicionarMembroGrupoProjeto()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoProjetoGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.addMembro(grupo.ConversaGUID, usuarioGUID);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_entrou', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioGUID: usuarioGUID,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.adicionarMembroGrupoProjeto() falhou:', err);
    }
  }

  // Chamado quando membro é removido/expulso/sai de GrupoProjeto
  async removerMembroGrupoProjeto(grupoProjetoGUID: string, usuarioGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.removerMembroGrupoProjeto()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoProjetoGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.removeMembro(grupo.ConversaGUID, usuarioGUID);
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'membro_saiu', {
        ConversaGUID: grupo.ConversaGUID,
        UsuarioGUID: usuarioGUID,
      });
    } catch (err) {
      console.error('❌ ConversaGrupoService.removerMembroGrupoProjeto() falhou:', err);
    }
  }

  // Chamado quando o grupo inteiro é dissolvido (líder saiu sozinho) — encerra a conversa, mesmo padrão de encerrarGrupoTurma.
  async encerrarConversaGrupoProjeto(grupoProjetoGUID: string): Promise<void> {
    console.log('🟣 ConversaGrupoService.encerrarConversaGrupoProjeto()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoProjetoGUID);
      if (!grupo) return;
      await this.#conversaDAO.setStatus(grupo.ConversaGUID, 'Inativa');
      const { SocketServer } = await import('../websocket/SocketServer');
      SocketServer.emit(grupo.ConversaGUID, 'grupo_encerrado', { ConversaGUID: grupo.ConversaGUID });
    } catch (err) {
      console.error('❌ ConversaGrupoService.encerrarConversaGrupoProjeto() falhou:', err);
    }
  }

  // Chamado quando liderança é transferida em GrupoProjeto
  async transferirLiderGrupoProjeto(
    grupoProjetoGUID: string,
    antigoLiderGUID: string,
    novoLiderGUID: string
  ): Promise<void> {
    console.log('🟣 ConversaGrupoService.transferirLiderGrupoProjeto()');
    try {
      const grupo = await this.#conversaGrupoDAO.findByRefGUID(grupoProjetoGUID);
      if (!grupo) return;
      await this.#conversaGrupoDAO.setFuncao(grupo.ConversaGUID, antigoLiderGUID, 'Membro');
      await this.#conversaGrupoDAO.setFuncao(grupo.ConversaGUID, novoLiderGUID, 'Lider');
    } catch (err) {
      console.error('❌ ConversaGrupoService.transferirLiderGrupoProjeto() falhou:', err);
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
