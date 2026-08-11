import { ConversaDAO } from '../repositories/conversa.repository';
import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { ConversaIndividualDAO } from '../repositories/conversa-individual.repository';
import { MensagemDAO, agruparReacoesPorMensagem, agruparLeitoresPorMensagem } from '../repositories/mensagem.repository';
import { UsuarioDAO } from '../repositories/usuario.repository';
import ErrorResponse from '../utils/ErrorResponse';

export interface MensagemFixadaDTO {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemConteudo: string;
  MensagemRemetenteGUID: string;
  MensagemCreatedAt: string;
  MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
  FixadaPorGUID: string;
  FixadaAt: string;
}

export interface ConversaListItemDTO {
  ConversaGUID: string;
  ConversaTipo: 'Individual' | 'Grupo';
  // Grupo
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: 'Turma' | 'Tarefa' | null;
  // Individual
  ParceiroGUID: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;
  // Comum
  UltimaMensagem: {
    MensagemConteudo: string;
    MensagemRemetenteGUID: string;
    RemetenteNome: string;
    MensagemCreatedAt: string;
    MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
  } | null;
  NaoLidas: number;
}

export interface MembroDTO {
  UsuarioGUID: string;
  UsuarioNome: string;
  MembroFuncao: 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';
  MembroEntradaAt: string;
}

export interface ConversaDetalheDTO {
  ConversaGUID: string;
  ConversaTipo: 'Individual' | 'Grupo';
  // Grupo
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: 'Turma' | 'Tarefa' | null;
  ConversaGrupoRefGUID: string | null;
  Membros: MembroDTO[];
  // Individual
  ParceiroGUID: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;
  // Comum
  MensagensFixadas: MensagemFixadaDTO[];
  Mensagens: any[];
  HasMore: boolean;
}

export default class ConversaService {
  #conversaDAO: ConversaDAO;
  #conversaGrupoDAO: ConversaGrupoDAO;
  #conversaIndividualDAO: ConversaIndividualDAO;
  #mensagemDAO: MensagemDAO;
  #usuarioDAO: UsuarioDAO;

  constructor(
    conversaDAO: ConversaDAO,
    conversaGrupoDAO: ConversaGrupoDAO,
    conversaIndividualDAO: ConversaIndividualDAO,
    mensagemDAO: MensagemDAO,
    usuarioDAO: UsuarioDAO
  ) {
    console.log('⬆️  ConversaService.constructor()');
    this.#conversaDAO = conversaDAO;
    this.#conversaGrupoDAO = conversaGrupoDAO;
    this.#conversaIndividualDAO = conversaIndividualDAO;
    this.#mensagemDAO = mensagemDAO;
    this.#usuarioDAO = usuarioDAO;
  }

  async listarConversas(usuarioGUID: string): Promise<ConversaListItemDTO[]> {
    console.log('🟣 ConversaService.listarConversas()');
    const conversas = await this.#conversaDAO.findAllByUsuarioGUID(usuarioGUID);
    const result: ConversaListItemDTO[] = [];

    for (const c of conversas) {
      const ultimaMensagem = await this.#mensagemDAO.findUltimaMensagem(c.ConversaGUID);
      const naoLidas = await this.#mensagemDAO.countNaoLidas(c.ConversaGUID, usuarioGUID);

      if (c.ConversaTipo === 'Grupo') {
        const grupo = await this.#conversaGrupoDAO.findByConversaGUID(c.ConversaGUID);
        result.push({
          ConversaGUID: c.ConversaGUID,
          ConversaTipo: 'Grupo',
          ConversaGrupoNome: grupo?.ConversaGrupoNome ?? null,
          ConversaGrupoTipo: grupo?.ConversaGrupoTipo ?? null,
          ParceiroGUID: null,
          ParceiroNome: null,
          TagContextual: null,
          UltimaMensagem: ultimaMensagem,
          NaoLidas: naoLidas,
        });
      } else {
        const parceiro = await this.#conversaIndividualDAO.getParceiroInfo(c.ConversaGUID, usuarioGUID);
        result.push({
          ConversaGUID: c.ConversaGUID,
          ConversaTipo: 'Individual',
          ConversaGrupoNome: null,
          ConversaGrupoTipo: null,
          ParceiroGUID: parceiro?.ParceiroGUID ?? null,
          ParceiroNome: parceiro?.ParceiroNome ?? null,
          TagContextual: null,
          UltimaMensagem: ultimaMensagem,
          NaoLidas: naoLidas,
        });
      }
    }

    return result;
  }

  async buscarConversa(conversaGUID: string, usuarioGUID: string): Promise<ConversaDetalheDTO> {
    console.log('🟣 ConversaService.buscarConversa()');
    const conversa = await this.#conversaDAO.findById(conversaGUID);
    if (!conversa || conversa.ConversaStatus === 'Inativa') {
      throw new ErrorResponse(404, 'Conversa não encontrada');
    }

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, usuarioGUID);
    if (!isParticipante) {
      throw new ErrorResponse(403, 'Você não faz parte desta conversa');
    }

    const mensagens = await this.#mensagemDAO.findByConversa(conversaGUID, 30);
    const hasMore = mensagens.length === 30;
    const fixadas = await this.#mensagemDAO.findPinnedMessages(conversaGUID);

    const mensagemGUIDs = mensagens.map((m) => m.MensagemGUID);
    const reacoesPorMensagem = agruparReacoesPorMensagem(await this.#mensagemDAO.findReacoesPorMensagens(mensagemGUIDs));
    const leitoresPorMensagem = agruparLeitoresPorMensagem(await this.#mensagemDAO.findLeitoresPorMensagens(mensagemGUIDs));
    const mensagensDTO = mensagens.map((m) => ({
      ...m.toJSON(),
      Reacoes: reacoesPorMensagem[m.MensagemGUID] ?? [],
      Leitores: leitoresPorMensagem[m.MensagemGUID] ?? [],
    }));

    const mensagensFixadasDTO: MensagemFixadaDTO[] = fixadas.map((f) => ({
      MensagemGUID: f.MensagemGUID,
      ConversaGUID: f.ConversaGUID,
      MensagemConteudo: f.MensagemConteudo,
      MensagemRemetenteGUID: f.MensagemRemetenteGUID,
      MensagemCreatedAt: (f.MensagemCreatedAt as Date).toISOString(),
      MensagemTipo: f.MensagemTipo,
      FixadaPorGUID: f.FixadaPorGUID,
      FixadaAt: (f.FixadaAt as Date).toISOString(),
    }));

    if (conversa.ConversaTipo === 'Grupo') {
      const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
      const membros = await this.#conversaGrupoDAO.findMembrosComNome(conversaGUID);

      return {
        ConversaGUID: conversa.ConversaGUID,
        ConversaTipo: 'Grupo',
        ConversaGrupoNome: grupo?.ConversaGrupoNome ?? null,
        ConversaGrupoTipo: grupo?.ConversaGrupoTipo ?? null,
        ConversaGrupoRefGUID: grupo?.ConversaGrupoRefGUID ?? null,
        Membros: membros.map((m) => ({
          UsuarioGUID: m.MembroUsuarioGUID,
          UsuarioNome: m.UsuarioNome,
          MembroFuncao: m.MembroFuncao,
          MembroEntradaAt: m.MembroEntradaAt.toISOString(),
        })),
        ParceiroGUID: null,
        ParceiroNome: null,
        TagContextual: null,
        MensagensFixadas: mensagensFixadasDTO,
        Mensagens: mensagensDTO,
        HasMore: hasMore,
      };
    } else {
      const parceiro = await this.#conversaIndividualDAO.getParceiroInfo(conversaGUID, usuarioGUID);

      return {
        ConversaGUID: conversa.ConversaGUID,
        ConversaTipo: 'Individual',
        ConversaGrupoNome: null,
        ConversaGrupoTipo: null,
        ConversaGrupoRefGUID: null,
        Membros: [],
        ParceiroGUID: parceiro?.ParceiroGUID ?? null,
        ParceiroNome: parceiro?.ParceiroNome ?? null,
        TagContextual: null,
        MensagensFixadas: mensagensFixadasDTO,
        Mensagens: mensagensDTO,
        HasMore: hasMore,
      };
    }
  }
}
