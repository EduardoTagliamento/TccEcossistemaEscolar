import { Content } from "@google/genai";
import { getAssistenteAgent, FerramentaHandler } from "../ai/agents/assistenteAgent";
import { UsuarioDAO } from "../repositories/usuario.repository";
import TarefaAcademicaService from "./tarefaacademica.service";
import MateriaService from "./materia.service";
import EscolaxUsuarioxFuncaoService from "./escolaxusuarioxfuncao.service";
import CalendarioService from "./calendario.service";
import ConversaService from "./conversa.service";
import { normalizarTelefone } from "../utils/helpers/telefone.helper";
import { gerarGUID } from "../utils/helpers/guid.helper";
import ErrorResponse from "../utils/ErrorResponse";

interface EscolaOpcao {
  EscolaGUID: string;
  EscolaNome: string;
  /** Papéis ativos do usuário nesta escola (FuncaoNome: "Aluno", "Professor", "Coordenacao"...). */
  funcoes: string[];
}

interface ConversaResumoCache {
  ConversaGUID: string;
  nome: string;
}

/**
 * Estado de uma conversa do chatbot — mantido só em memória (v1: sem
 * persistência, cai num restart do processo; se precisar sobreviver a
 * deploy/reinício, migrar pra tabela própria depois, seguindo o padrão de
 * repository/DAO do resto do backend).
 *
 * `usuarioGUID`/`escolaGUID` são a identidade resolvida da conversa — nunca
 * expostos como parâmetro que o modelo controla (ver assistenteAgent.ts).
 * `funcoes` decide quais ferramentas o modelo enxerga (gating por papel).
 * `conversasCache` é a whitelist de ConversaGUIDs que ver_mensagens_conversa
 * aceita (populada por consultar_conversas).
 */
interface ChatbotSessao {
  historico: Content[];
  usuarioGUID: string | null;
  escolaGUID: string | null;
  funcoes: string[];
  escolasDisponiveis: EscolaOpcao[];
  conversasCache: ConversaResumoCache[];
}

export interface EnviarMensagemResultado {
  sessionId: string;
  resposta: string;
}

export default class ChatbotService {
  #sessoes: Map<string, ChatbotSessao> = new Map();
  #usuarioDAO: UsuarioDAO;
  #tarefaService: TarefaAcademicaService;
  #materiaService: MateriaService;
  #escolaxUsuarioxFuncaoService: EscolaxUsuarioxFuncaoService;
  #calendarioService: CalendarioService;
  #conversaService: ConversaService;

  constructor(
    usuarioDAODependency: UsuarioDAO,
    tarefaServiceDependency: TarefaAcademicaService,
    materiaServiceDependency: MateriaService,
    escolaxUsuarioxFuncaoServiceDependency: EscolaxUsuarioxFuncaoService,
    calendarioServiceDependency: CalendarioService,
    conversaServiceDependency: ConversaService
  ) {
    console.log("⬆️  ChatbotService.constructor()");
    this.#usuarioDAO = usuarioDAODependency;
    this.#tarefaService = tarefaServiceDependency;
    this.#materiaService = materiaServiceDependency;
    this.#escolaxUsuarioxFuncaoService = escolaxUsuarioxFuncaoServiceDependency;
    this.#calendarioService = calendarioServiceDependency;
    this.#conversaService = conversaServiceDependency;
  }

  enviarMensagem = async (sessionIdRecebido: string | undefined, mensagem: string): Promise<EnviarMensagemResultado> => {
    console.log("🟣 ChatbotService.enviarMensagem()");

    if (!mensagem || !mensagem.trim()) {
      throw new ErrorResponse(400, "Mensagem vazia", { message: "A mensagem não pode ser vazia." });
    }

    const sessionId = sessionIdRecebido && this.#sessoes.has(sessionIdRecebido) ? sessionIdRecebido : gerarGUID();
    const sessao = this.#sessoes.get(sessionId) ?? this.#criarSessaoVazia();
    this.#sessoes.set(sessionId, sessao);

    const resposta = await getAssistenteAgent().responder(
      sessao.historico,
      mensagem.trim(),
      () => this.#construirFerramentas(sessao)
    );

    return { sessionId, resposta };
  };

  /**
   * Entrada do canal WhatsApp (Evolution API). Diferente de `enviarMensagem`,
   * aqui o número de quem mandou a mensagem JÁ É a identidade — então
   * resolvemos o usuário server-side na primeira mensagem da conversa e
   * semeamos o histórico com o resultado, pra o modelo não precisar pedir
   * "me informe seu telefone". A sessão é chaveada pelo próprio número.
   *
   * @param telefoneRemetente - Número do remetente, dígitos com ou sem DDI 55
   *                            (ex.: "5512988493959" ou "12988493959").
   */
  enviarMensagemWhatsapp = async (telefoneRemetente: string, mensagem: string): Promise<EnviarMensagemResultado> => {
    console.log("🟢 ChatbotService.enviarMensagemWhatsapp()");

    if (!mensagem || !mensagem.trim()) {
      throw new ErrorResponse(400, "Mensagem vazia", { message: "A mensagem não pode ser vazia." });
    }

    const soDigitos = String(telefoneRemetente ?? "").replace(/\D/g, "");
    // JID da Evolution vem com DDI (55...). O telefone no banco é (XX) XXXXX-XXXX
    // sem DDI, e normalizarTelefone só formata quando recebe 11 dígitos.
    const nacional = soDigitos.startsWith("55") && soDigitos.length >= 12 ? soDigitos.slice(2) : soDigitos;

    const sessionId = `wa:${nacional}`;
    const sessao = this.#sessoes.get(sessionId) ?? this.#criarSessaoVazia();
    this.#sessoes.set(sessionId, sessao);

    if (!sessao.usuarioGUID && sessao.historico.length === 0) {
      const resultado = await this.#identificarPorTelefone(sessao, nacional);
      const identificou = resultado.encontrado === true && resultado.semVinculoAtivo !== true;
      if (identificou) {
        // Semeia o histórico com um par functionCall/functionResponse igual ao
        // que o loop do agente produziria se o modelo tivesse chamado a
        // ferramenta — assim o modelo vê a identidade (e, se for o caso, a
        // lista de escolas) já resolvida e segue o fluxo normal.
        sessao.historico.push(
          { role: "model", parts: [{ functionCall: { name: "identificar_usuario_por_telefone", args: { telefone: nacional } } }] },
          { role: "user", parts: [{ functionResponse: { name: "identificar_usuario_por_telefone", response: { output: resultado } } }] }
        );
      }
    }

    const resposta = await getAssistenteAgent().responder(
      sessao.historico,
      mensagem.trim(),
      () => this.#construirFerramentas(sessao)
    );

    return { sessionId, resposta };
  };

  #criarSessaoVazia = (): ChatbotSessao => ({
    historico: [],
    usuarioGUID: null,
    escolaGUID: null,
    funcoes: [],
    escolasDisponiveis: [],
    conversasCache: [],
  });

  /**
   * Cada ferramenta fecha sobre `sessao` (mutável) — é assim que
   * `identificar_usuario_por_telefone`/`selecionar_escola` gravam a
   * identidade resolvida, e é assim que `consultar_tarefas`/
   * `consultar_materias` a leem, sem que nenhum GUID passe pelas mãos do
   * modelo.
   */
  /**
   * Núcleo da identificação por telefone — compartilhado pela ferramenta
   * `identificar_usuario_por_telefone` (fluxo web, o modelo passa o número) e
   * pela pré-identificação do canal WhatsApp (o número vem do remetente).
   * Muta `sessao` (usuarioGUID / escolaGUID / escolasDisponiveis) como efeito
   * colateral e devolve o mesmo objeto de resultado que o modelo consome.
   */
  #identificarPorTelefone = async (sessao: ChatbotSessao, telefoneBruto: string): Promise<Record<string, unknown>> => {
    const telefone = normalizarTelefone(String(telefoneBruto ?? ""));

    const usuario = await this.#usuarioDAO.findByTelefone(telefone);
    if (!usuario) {
      return { encontrado: false };
    }
    if (usuario.UsuarioStatus !== "Ativo") {
      return { encontrado: false, motivo: "conta inativa ou bloqueada" };
    }

    const vinculos = await this.#escolaxUsuarioxFuncaoService.findEscolasByUsuario(usuario.UsuarioGUID);
    const vinculosAtivos = vinculos.filter((v) => v.funcoes.some((f) => f.Status === "Ativo"));

    if (vinculosAtivos.length === 0) {
      return { encontrado: true, semVinculoAtivo: true };
    }

    sessao.usuarioGUID = usuario.UsuarioGUID;
    const opcoes: EscolaOpcao[] = vinculosAtivos.map((v) => ({
      EscolaGUID: v.escola.EscolaGUID,
      EscolaNome: v.escola.EscolaNome,
      funcoes: [...new Set(v.funcoes.filter((f) => f.Status === "Ativo").map((f) => f.FuncaoNome))],
    }));

    if (opcoes.length === 1) {
      sessao.escolaGUID = opcoes[0].EscolaGUID;
      sessao.funcoes = opcoes[0].funcoes;
      return {
        encontrado: true,
        nomeUsuario: usuario.UsuarioNome,
        precisaEscolherEscola: false,
        escola: { EscolaGUID: opcoes[0].EscolaGUID, EscolaNome: opcoes[0].EscolaNome },
        papeis: opcoes[0].funcoes,
      };
    }

    sessao.escolasDisponiveis = opcoes;
    return {
      encontrado: true,
      nomeUsuario: usuario.UsuarioNome,
      precisaEscolherEscola: true,
      opcoes: opcoes.map((o) => ({ EscolaGUID: o.EscolaGUID, EscolaNome: o.EscolaNome, papeis: o.funcoes })),
    };
  };

  /**
   * Monta o conjunto de ferramentas desta conversa conforme o estado da
   * identificação e o papel do usuário. Chamado a cada iteração do loop do
   * agente (ver assistenteAgent.responder) — então, dentro do mesmo turno,
   * novas ferramentas passam a existir assim que a identidade/escola são
   * resolvidas.
   */
  #construirFerramentas = (sessao: ChatbotSessao): Record<string, FerramentaHandler> => {
    const handlers: Record<string, FerramentaHandler> = {
      identificar_usuario_por_telefone: async (args) =>
        this.#identificarPorTelefone(sessao, String(args.telefone ?? "")),
    };

    // Escolha de escola: só enquanto há opções pendentes e nenhuma foi fixada.
    if (sessao.escolasDisponiveis.length > 0 && !sessao.escolaGUID) {
      handlers.selecionar_escola = async (args) => {
        if (!sessao.usuarioGUID) {
          return { error: "identifique o usuário primeiro (identificar_usuario_por_telefone)" };
        }
        const escolaGUID = String(args.escolaGUID ?? "");
        // Nunca aceita um EscolaGUID arbitrário do modelo — só um dos que a
        // própria identificação já resolveu e ofereceu como opção.
        const opcaoValida = sessao.escolasDisponiveis.find((o) => o.EscolaGUID === escolaGUID);
        if (!opcaoValida) {
          return { error: "EscolaGUID não corresponde a nenhuma das opções oferecidas" };
        }
        sessao.escolaGUID = opcaoValida.EscolaGUID;
        sessao.funcoes = opcaoValida.funcoes;
        return { ok: true, escola: { EscolaGUID: opcaoValida.EscolaGUID, EscolaNome: opcaoValida.EscolaNome }, papeis: opcaoValida.funcoes };
      };
    }

    // Ferramentas de consulta: só depois de identidade + escola resolvidas.
    if (sessao.usuarioGUID && sessao.escolaGUID) {
      const usuarioGUID = sessao.usuarioGUID;
      const escolaGUID = sessao.escolaGUID;

      // Calendário: disponível pra qualquer papel.
      handlers.consultar_calendario = async (args) => {
        const hoje = new Date();
        const dataInicio = this.#parseDataOuPadrao(args.dataInicio, hoje);
        const padraoFim = new Date(hoje);
        padraoFim.setDate(padraoFim.getDate() + 30);
        const dataFim = this.#parseDataOuPadrao(args.dataFim, padraoFim);

        const avisos = await this.#calendarioService.buscarCalendario(usuarioGUID, escolaGUID, { DataInicio: dataInicio, DataFim: dataFim });
        return {
          periodo: { inicio: dataInicio.toISOString().slice(0, 10), fim: dataFim.toISOString().slice(0, 10) },
          avisos: avisos.map((a) => ({
            tipo: a.TipoAviso,
            titulo: a.Titulo,
            data: new Date(a.DataPrazo).toISOString().slice(0, 10),
            status: a.StatusTexto,
            feito: a.StatusBoolean ?? undefined,
          })),
        };
      };

      // Conversas: disponível pra qualquer papel. Guarda a lista na sessão pra
      // ver_mensagens_conversa validar o ConversaGUID contra ela (whitelist).
      handlers.consultar_conversas = async () => {
        const conversas = await this.#conversaService.listarConversas(usuarioGUID, escolaGUID);
        sessao.conversasCache = conversas.map((c) => ({
          ConversaGUID: c.ConversaGUID,
          nome: c.ConversaGrupoNome ?? c.ParceiroNome ?? "Conversa",
        }));
        return {
          conversas: conversas.map((c) => ({
            ConversaGUID: c.ConversaGUID,
            nome: c.ConversaGrupoNome ?? c.ParceiroNome ?? "Conversa",
            tipo: c.ConversaTipo,
            naoLidas: c.NaoLidas,
            ultimaMensagem: c.UltimaMensagem
              ? { de: c.UltimaMensagem.RemetenteNome, texto: c.UltimaMensagem.MensagemConteudo, quando: c.UltimaMensagem.MensagemCreatedAt }
              : null,
          })),
        };
      };

      handlers.ver_mensagens_conversa = async (args) => {
        const conversaGUID = String(args.conversaGUID ?? "");
        // Só aceita um ConversaGUID que já veio de consultar_conversas nesta sessão.
        const alvo = sessao.conversasCache.find((c) => c.ConversaGUID === conversaGUID);
        if (!alvo) {
          return { error: "ConversaGUID não corresponde a nenhuma conversa listada — chame consultar_conversas primeiro" };
        }

        const detalhe = await this.#conversaService.buscarConversa(conversaGUID, usuarioGUID);
        const nomePorGUID = new Map<string, string>();
        for (const m of detalhe.Membros ?? []) nomePorGUID.set(m.UsuarioGUID, m.UsuarioNome);

        const mensagens = (detalhe.Mensagens ?? [])
          .slice(-20)
          .map((m: any) => ({
            de: m.MensagemRemetenteGUID === usuarioGUID
              ? "você"
              : nomePorGUID.get(m.MensagemRemetenteGUID) ?? detalhe.ParceiroNome ?? "outro",
            texto: m.MensagemDeletedAt ? "(mensagem apagada)" : m.MensagemConteudo,
            quando: m.MensagemCreatedAt,
          }));

        return { conversa: alvo.nome, mensagens };
      };

      // Ferramentas de aluno.
      if (sessao.funcoes.includes("Aluno")) {
        handlers.consultar_tarefas = async () => {
          const tarefas = await this.#tarefaService.listarPendentesAluno(usuarioGUID, escolaGUID);
          return { tarefas };
        };

        handlers.consultar_materias = async () => {
          const materias = await this.#materiaService.listarMateriasDoAluno(usuarioGUID, escolaGUID);
          return {
            materias: materias.map((m) => ({ MateriaGUID: m.MateriaGUID, MateriaNome: m.MateriaNome, ProfessorNome: m.ProfessorNome })),
          };
        };
      }
    }

    return handlers;
  };

  #parseDataOuPadrao = (valor: unknown, padrao: Date): Date => {
    if (typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      const d = new Date(`${valor}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return padrao;
  };
}
