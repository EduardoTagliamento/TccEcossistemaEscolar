import { ConversaDAO } from '../repositories/conversa.repository';
import { ConversaGrupoDAO } from '../repositories/conversa-grupo.repository';
import { ConversaIndividualDAO } from '../repositories/conversa-individual.repository';
import { MensagemDAO } from '../repositories/mensagem.repository';
import ErrorResponse from '../utils/ErrorResponse';

export interface MensagemFixadaDTO {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemConteudo: string;
  MensagemRemetenteCPF: string;
  MensagemCreatedAt: string;
  FixadaPorCPF: string;
  FixadaAt: string;
}

export interface ConversaListItemDTO {
  ConversaGUID: string;
  ConversaTipo: 'Individual' | 'Grupo';
  // Grupo
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: 'Turma' | 'Tarefa' | null;
  // Individual
  ParceiroCPF: string | null;
  ParceiroNome: string | null;
  TagContextual: string | null;
  // Comum
  UltimaMensagem: {
    MensagemConteudo: string;
    MensagemRemetenteCPF: string;
    RemetenteNome: string;
    MensagemCreatedAt: string;
  } | null;
  NaoLidas: number;
}

export interface MembroDTO {
  UsuarioCPF: string;
  MembroFuncao: 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';
  MembroEntradaAt: string;
}

export interface ConversaDetalheDTO {
  ConversaGUID: string;
  ConversaTipo: 'Individual' | 'Grupo';
  // Grupo
  ConversaGrupoNome: string | null;
  ConversaGrupoTipo: 'Turma' | 'Tarefa' | null;
  Membros: MembroDTO[];
  // Individual
  ParceiroCPF: string | null;
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

  constructor(
    conversaDAO: ConversaDAO,
    conversaGrupoDAO: ConversaGrupoDAO,
    conversaIndividualDAO: ConversaIndividualDAO,
    mensagemDAO: MensagemDAO
  ) {
    console.log('⬆️  ConversaService.constructor()');
    this.#conversaDAO = conversaDAO;
    this.#conversaGrupoDAO = conversaGrupoDAO;
    this.#conversaIndividualDAO = conversaIndividualDAO;
    this.#mensagemDAO = mensagemDAO;
  }

  async listarConversas(usuarioCPF: string): Promise<ConversaListItemDTO[]> {
    console.log('🟣 ConversaService.listarConversas()');
    const conversas = await this.#conversaDAO.findAllByUsuarioCPF(usuarioCPF);
    const result: ConversaListItemDTO[] = [];

    for (const c of conversas) {
      const ultimaMensagem = await this.#mensagemDAO.findUltimaMensagem(c.ConversaGUID);
      const naoLidas = await this.#mensagemDAO.countNaoLidas(c.ConversaGUID, usuarioCPF);

      if (c.ConversaTipo === 'Grupo') {
        const grupo = await this.#conversaGrupoDAO.findByConversaGUID(c.ConversaGUID);
        result.push({
          ConversaGUID: c.ConversaGUID,
          ConversaTipo: 'Grupo',
          ConversaGrupoNome: grupo?.ConversaGrupoNome ?? null,
          ConversaGrupoTipo: grupo?.ConversaGrupoTipo ?? null,
          ParceiroCPF: null,
          ParceiroNome: null,
          TagContextual: null,
          UltimaMensagem: ultimaMensagem,
          NaoLidas: naoLidas,
        });
      } else {
        const parceiro = await this.#conversaIndividualDAO.getParceiroInfo(c.ConversaGUID, usuarioCPF);
        result.push({
          ConversaGUID: c.ConversaGUID,
          ConversaTipo: 'Individual',
          ConversaGrupoNome: null,
          ConversaGrupoTipo: null,
          ParceiroCPF: parceiro?.ParceiroCPF ?? null,
          ParceiroNome: parceiro?.ParceiroNome ?? null,
          TagContextual: null,
          UltimaMensagem: ultimaMensagem,
          NaoLidas: naoLidas,
        });
      }
    }

    return result;
  }

  async buscarConversa(conversaGUID: string, usuarioCPF: string): Promise<ConversaDetalheDTO> {
    console.log('🟣 ConversaService.buscarConversa()');
    const conversa = await this.#conversaDAO.findById(conversaGUID);
    if (!conversa || conversa.ConversaStatus === 'Inativa') {
      throw new ErrorResponse(404, 'Conversa não encontrada');
    }

    const isParticipante = await this.#conversaDAO.isParticipante(conversaGUID, usuarioCPF);
    if (!isParticipante) {
      throw new ErrorResponse(403, 'Você não faz parte desta conversa');
    }

    const mensagens = await this.#mensagemDAO.findByConversa(conversaGUID, 30);
    const hasMore = mensagens.length === 30;
    const fixadas = await this.#mensagemDAO.findPinnedMessages(conversaGUID);

    const mensagensFixadasDTO: MensagemFixadaDTO[] = fixadas.map((f) => ({
      MensagemGUID: f.MensagemGUID,
      ConversaGUID: f.ConversaGUID,
      MensagemConteudo: f.MensagemConteudo,
      MensagemRemetenteCPF: f.MensagemRemetenteCPF,
      MensagemCreatedAt: (f.MensagemCreatedAt as Date).toISOString(),
      FixadaPorCPF: f.FixadaPorCPF,
      FixadaAt: (f.FixadaAt as Date).toISOString(),
    }));

    if (conversa.ConversaTipo === 'Grupo') {
      const grupo = await this.#conversaGrupoDAO.findByConversaGUID(conversaGUID);
      const membros = await this.#conversaGrupoDAO.findMembros(conversaGUID);

      return {
        ConversaGUID: conversa.ConversaGUID,
        ConversaTipo: 'Grupo',
        ConversaGrupoNome: grupo?.ConversaGrupoNome ?? null,
        ConversaGrupoTipo: grupo?.ConversaGrupoTipo ?? null,
        Membros: membros.map((m) => ({
          UsuarioCPF: m.MembroUsuarioCPF,
          MembroFuncao: m.MembroFuncao,
          MembroEntradaAt: m.MembroEntradaAt.toISOString(),
        })),
        ParceiroCPF: null,
        ParceiroNome: null,
        TagContextual: null,
        MensagensFixadas: mensagensFixadasDTO,
        Mensagens: mensagens.map((m) => m.toJSON()),
        HasMore: hasMore,
      };
    } else {
      const parceiro = await this.#conversaIndividualDAO.getParceiroInfo(conversaGUID, usuarioCPF);

      return {
        ConversaGUID: conversa.ConversaGUID,
        ConversaTipo: 'Individual',
        ConversaGrupoNome: null,
        ConversaGrupoTipo: null,
        Membros: [],
        ParceiroCPF: parceiro?.ParceiroCPF ?? null,
        ParceiroNome: parceiro?.ParceiroNome ?? null,
        TagContextual: null,
        MensagensFixadas: mensagensFixadasDTO,
        Mensagens: mensagens.map((m) => m.toJSON()),
        HasMore: hasMore,
      };
    }
  }
}
