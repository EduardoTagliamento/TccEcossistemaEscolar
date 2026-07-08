import { v4 as uuidv4 } from 'uuid';
import Mensagem from '../entities/mensagem.model';
import { MensagemDAO } from '../repositories/mensagem.repository';
import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { ConversaDAO } from '../repositories/conversa.repository';
import { MensagemFixadaDTO } from './conversa.service';
import ErrorResponse from '../utils/ErrorResponse';

export interface MensagemDTO {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemRemetenteCPF: string;
  MensagemConteudo: string;
  MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
  MensagemCreatedAt: string;
  MensagemEditadaAt: string | null;
}

export interface HistoricoDTO {
  Mensagens: MensagemDTO[];
  HasMore: boolean;
}

export default class MensagemService {
  #mensagemDAO: MensagemDAO;
  #conversaGrupoDAO: ConversaGrupoDAO;
  #conversaDAO: ConversaDAO;

  constructor(
    mensagemDAO: MensagemDAO,
    conversaGrupoDAO: ConversaGrupoDAO,
    conversaDAO: ConversaDAO
  ) {
    console.log('⬆️  MensagemService.constructor()');
    this.#mensagemDAO = mensagemDAO;
    this.#conversaGrupoDAO = conversaGrupoDAO;
    this.#conversaDAO = conversaDAO;
  }

  async enviar(
    conversaGUID: string,
    remetenteCPF: string,
    conteudo: string
  ): Promise<MensagemDTO> {
    console.log('🟣 MensagemService.enviar()');

    const conversa = await this.#conversaDAO.findById(conversaGUID);
    if (!conversa || conversa.ConversaStatus === 'Inativa') {
      throw new ErrorResponse(403, 'Conversa inativa ou inexistente');
    }

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, remetenteCPF);
    if (!isParticipante) {
      throw new ErrorResponse(403, 'Você não faz parte desta conversa');
    }

    const mensagem = new Mensagem();
    mensagem.MensagemGUID = uuidv4();
    mensagem.ConversaGUID = conversaGUID;
    mensagem.MensagemRemetenteCPF = remetenteCPF;
    mensagem.MensagemConteudo = conteudo;
    mensagem.MensagemTipo = 'Texto';
    mensagem.MensagemCreatedAt = new Date();

    await this.#mensagemDAO.create(mensagem);
    return this.#toDTO(mensagem);
  }

  async listarHistorico(
    conversaGUID: string,
    usuarioCPF: string,
    limit: number = 30,
    beforeGUID?: string
  ): Promise<HistoricoDTO> {
    console.log('🟣 MensagemService.listarHistorico()');

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, usuarioCPF);
    if (!isParticipante) {
      throw new ErrorResponse(403, 'Você não faz parte desta conversa');
    }

    const mensagens = await this.#mensagemDAO.findByConversa(conversaGUID, limit, beforeGUID);
    return {
      Mensagens: mensagens.map((m) => this.#toDTO(m)),
      HasMore: mensagens.length === limit,
    };
  }

  async marcarComoLida(conversaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟣 MensagemService.marcarComoLida()');
    await this.#mensagemDAO.markAllAsRead(conversaGUID, usuarioCPF);
  }

  async deletarMensagem(mensagemGUID: string, conversaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟣 MensagemService.deletarMensagem()');

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, usuarioCPF);
    if (!isParticipante) throw new ErrorResponse(403, 'Você não faz parte desta conversa');

    const mensagem = await this.#mensagemDAO.findById(mensagemGUID);
    if (!mensagem || mensagem.ConversaGUID !== conversaGUID || mensagem.MensagemDeletedAt !== null) {
      throw new ErrorResponse(404, 'Mensagem não encontrada nesta conversa');
    }

    if (mensagem.MensagemRemetenteCPF !== usuarioCPF) {
      const conversa = await this.#conversaDAO.findById(conversaGUID);
      if (conversa?.ConversaTipo === 'Individual') {
        throw new ErrorResponse(403, 'Você só pode deletar suas próprias mensagens em conversas individuais');
      }
      const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
      const funcao = await this.#conversaGrupoDAO.getFuncao(conversaGUID, usuarioCPF);
      if (grupo?.ConversaGrupoTipo === 'Tarefa') {
        if (funcao !== 'Lider') {
          throw new ErrorResponse(403, 'Apenas o Líder pode deletar mensagens de outros membros');
        }
      } else {
        if (funcao !== 'Representante' && funcao !== 'Vice-Representante') {
          throw new ErrorResponse(403, 'Apenas o Representante ou Vice-Representante pode deletar mensagens de outros membros');
        }
      }
    }

    await this.#mensagemDAO.softDelete(mensagemGUID);

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'mensagem_deletada', {
      ConversaGUID: conversaGUID,
      MensagemGUID: mensagemGUID,
      DeletadaPorCPF: usuarioCPF,
    });
  }

  async editarMensagem(
    mensagemGUID: string,
    conversaGUID: string,
    usuarioCPF: string,
    novoConteudo: string
  ): Promise<MensagemDTO> {
    console.log('🟣 MensagemService.editarMensagem()');

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, usuarioCPF);
    if (!isParticipante) throw new ErrorResponse(403, 'Você não faz parte desta conversa');

    const mensagem = await this.#mensagemDAO.findById(mensagemGUID);
    if (!mensagem || mensagem.ConversaGUID !== conversaGUID || mensagem.MensagemDeletedAt !== null) {
      throw new ErrorResponse(404, 'Mensagem não encontrada nesta conversa');
    }

    if (mensagem.MensagemRemetenteCPF !== usuarioCPF) {
      throw new ErrorResponse(403, 'Você só pode editar suas próprias mensagens');
    }

    const conteudoTrimmed = novoConteudo.trim();
    if (conteudoTrimmed.length < 1 || conteudoTrimmed.length > 4000) {
      throw new ErrorResponse(400, 'MensagemConteudo deve ter entre 1 e 4000 caracteres');
    }

    const { MensagemEditadaAt } = await this.#mensagemDAO.edit(mensagemGUID, conteudoTrimmed);

    const dto: MensagemDTO = {
      MensagemGUID: mensagemGUID,
      ConversaGUID: conversaGUID,
      MensagemRemetenteCPF: usuarioCPF,
      MensagemConteudo: conteudoTrimmed,
      MensagemTipo: mensagem.MensagemTipo,
      MensagemCreatedAt: mensagem.MensagemCreatedAt.toISOString(),
      MensagemEditadaAt: MensagemEditadaAt.toISOString(),
    };

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'mensagem_editada', dto);
    return dto;
  }

  async fixarMensagem(
    mensagemGUID: string,
    conversaGUID: string,
    usuarioCPF: string
  ): Promise<MensagemFixadaDTO> {
    console.log('🟣 MensagemService.fixarMensagem()');

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, usuarioCPF);
    if (!isParticipante) {
      throw new ErrorResponse(403, 'Você não faz parte desta conversa');
    }

    const conversa = await this.#conversaDAO.findById(conversaGUID);
    if (conversa?.ConversaTipo === 'Grupo') {
      const funcao = await this.#conversaGrupoDAO.getFuncao(conversaGUID, usuarioCPF);
      if (!funcao || !['Lider', 'Representante', 'Vice-Representante'].includes(funcao)) {
        throw new ErrorResponse(403, 'Apenas o Líder, Representante ou Vice-Representante pode fixar mensagens em grupos');
      }
    }

    const mensagem = await this.#mensagemDAO.findById(mensagemGUID);
    if (!mensagem || mensagem.ConversaGUID !== conversaGUID || mensagem.MensagemDeletedAt !== null) {
      throw new ErrorResponse(404, 'Mensagem não encontrada nesta conversa');
    }

    const { FixadaAt } = await this.#mensagemDAO.pinMessage(mensagemGUID, conversaGUID, usuarioCPF);

    const dto: MensagemFixadaDTO = {
      MensagemGUID: mensagemGUID,
      ConversaGUID: conversaGUID,
      MensagemConteudo: mensagem.MensagemConteudo,
      MensagemRemetenteCPF: mensagem.MensagemRemetenteCPF,
      MensagemCreatedAt: mensagem.MensagemCreatedAt.toISOString(),
      FixadaPorCPF: usuarioCPF,
      FixadaAt: FixadaAt.toISOString(),
    };

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'mensagem_fixada', dto);
    return dto;
  }

  async desafixarMensagem(
    mensagemGUID: string,
    conversaGUID: string,
    usuarioCPF: string
  ): Promise<void> {
    console.log('🟣 MensagemService.desafixarMensagem()');

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, usuarioCPF);
    if (!isParticipante) {
      throw new ErrorResponse(403, 'Você não faz parte desta conversa');
    }

    const conversa = await this.#conversaDAO.findById(conversaGUID);
    if (conversa?.ConversaTipo === 'Grupo') {
      const funcao = await this.#conversaGrupoDAO.getFuncao(conversaGUID, usuarioCPF);
      if (!funcao || !['Lider', 'Representante', 'Vice-Representante'].includes(funcao)) {
        throw new ErrorResponse(403, 'Apenas o Líder, Representante ou Vice-Representante pode desafixar mensagens em grupos');
      }
    }

    await this.#mensagemDAO.unpinMessage(mensagemGUID);

    const { SocketServer } = await import('../websocket/SocketServer');
    SocketServer.emit(conversaGUID, 'mensagem_desafixada', {
      ConversaGUID: conversaGUID,
      MensagemGUID: mensagemGUID,
      DesafixadaPorCPF: usuarioCPF,
    });
  }

  async listarMensagensFixadas(
    conversaGUID: string,
    usuarioCPF: string
  ): Promise<MensagemFixadaDTO[]> {
    console.log('🟣 MensagemService.listarMensagensFixadas()');

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, usuarioCPF);
    if (!isParticipante) {
      throw new ErrorResponse(403, 'Você não faz parte desta conversa');
    }

    const fixadas = await this.#mensagemDAO.findPinnedMessages(conversaGUID);
    return fixadas.map((f) => ({
      MensagemGUID: f.MensagemGUID,
      ConversaGUID: f.ConversaGUID,
      MensagemConteudo: f.MensagemConteudo,
      MensagemRemetenteCPF: f.MensagemRemetenteCPF,
      MensagemCreatedAt: (f.MensagemCreatedAt as Date).toISOString(),
      FixadaPorCPF: f.FixadaPorCPF,
      FixadaAt: (f.FixadaAt as Date).toISOString(),
    }));
  }

  #toDTO(m: Mensagem): MensagemDTO {
    return {
      MensagemGUID: m.MensagemGUID,
      ConversaGUID: m.ConversaGUID,
      MensagemRemetenteCPF: m.MensagemRemetenteCPF,
      MensagemConteudo: m.MensagemConteudo,
      MensagemTipo: m.MensagemTipo,
      MensagemCreatedAt: m.MensagemCreatedAt.toISOString(),
      MensagemEditadaAt: m.MensagemEditadaAt?.toISOString() ?? null,
    };
  }
}
