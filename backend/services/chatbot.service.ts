import { Content } from "@google/genai";
import { getAssistenteAgent, FerramentaHandler } from "../ai/agents/assistenteAgent";
import { UsuarioDAO } from "../repositories/usuario.repository";
import TarefaAcademicaService from "./tarefaacademica.service";
import MateriaService from "./materia.service";
import EscolaxUsuarioxFuncaoService from "./escolaxusuarioxfuncao.service";
import CalendarioService from "./calendario.service";
import ConversaService from "./conversa.service";
import MensagemService from "./mensagem.service";
import ConteudoService from "./conteudo.service";
import { AvisoService } from "./aviso.service";
import AnexoService from "./anexo.service";
import NotificacaoService from "./notificacao.service";
import { AnotacaoService } from "./anotacao.service";
import ProjetoService from "./projeto.service";
import CategoriaConteudoService from "./categoriaconteudo.service";
import PendenciaService from "./pendencia.service";
import GrupoTarefaService from "./grupotarefa.service";
import { getProvaAgendadaRecomendacaoService, RecomendacaoDTO } from "./provaagendadarecomendacao.service";
import { getAuditoriaService } from "./auditoria.service";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { TurmaDAO } from "../repositories/turma.repository";
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

interface TarefaResumoCache {
  TarefaGUID: string;
  titulo: string;
}

interface AlocacaoCache {
  MatProfTurGUID: string;
  MateriaGUID: string;
  TurmaGUID: string;
  materia: string;
  turma: string;
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
 * `conversasCache`/`tarefasCache`/`alocacoesCache` são whitelists de GUIDs que
 * as ferramentas de escrita (responder_conversa / marcar_tarefa_feita /
 * criar_tarefa / criar_conteudo_aula) e ver_mensagens_conversa aceitam —
 * populadas pelas ferramentas de listagem correspondentes.
 */
interface ChatbotSessao {
  historico: Content[];
  usuarioGUID: string | null;
  escolaGUID: string | null;
  funcoes: string[];
  escolasDisponiveis: EscolaOpcao[];
  conversasCache: ConversaResumoCache[];
  tarefasCache: TarefaResumoCache[];
  alocacoesCache: AlocacaoCache[];
  avisosCache: { AvisoGUID: string; titulo: string }[];
  projetosCache: { ProjetoGUID: string; nome: string }[];
  provasCache: { ProvaAgendadaGUID: string; titulo: string }[];
  materiasCache: { MateriaGUID: string; TurmaGUID: string; nome: string }[];
  /** Arquivo recebido pelo WhatsApp aguardando ser consumido por uma ferramenta (ex.: enviar_atividade). */
  anexoPendente: { buffer: Buffer; mimetype: string; fileName: string } | null;
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
  #mensagemService: MensagemService;
  #conteudoService: ConteudoService;
  #avisoService: AvisoService;
  #anexoService: AnexoService;
  #notificacaoService: NotificacaoService;
  #anotacaoService: AnotacaoService;
  #projetoService: ProjetoService;
  #categoriaConteudoService: CategoriaConteudoService;
  #pendenciaService: PendenciaService;
  #grupoTarefaService: GrupoTarefaService;
  #alocacaoDAO: MaterialProfessorTurmaDAO;
  #matriculaDAO: MatriculaDAO;
  #materiaDAO: MateriaDAO;
  #turmaDAO: TurmaDAO;

  constructor(
    usuarioDAODependency: UsuarioDAO,
    tarefaServiceDependency: TarefaAcademicaService,
    materiaServiceDependency: MateriaService,
    escolaxUsuarioxFuncaoServiceDependency: EscolaxUsuarioxFuncaoService,
    calendarioServiceDependency: CalendarioService,
    conversaServiceDependency: ConversaService,
    mensagemServiceDependency: MensagemService,
    conteudoServiceDependency: ConteudoService,
    avisoServiceDependency: AvisoService,
    anexoServiceDependency: AnexoService,
    notificacaoServiceDependency: NotificacaoService,
    anotacaoServiceDependency: AnotacaoService,
    projetoServiceDependency: ProjetoService,
    categoriaConteudoServiceDependency: CategoriaConteudoService,
    pendenciaServiceDependency: PendenciaService,
    grupoTarefaServiceDependency: GrupoTarefaService,
    alocacaoDAODependency: MaterialProfessorTurmaDAO,
    matriculaDAODependency: MatriculaDAO,
    materiaDAODependency: MateriaDAO,
    turmaDAODependency: TurmaDAO
  ) {
    console.log("⬆️  ChatbotService.constructor()");
    this.#usuarioDAO = usuarioDAODependency;
    this.#tarefaService = tarefaServiceDependency;
    this.#materiaService = materiaServiceDependency;
    this.#escolaxUsuarioxFuncaoService = escolaxUsuarioxFuncaoServiceDependency;
    this.#calendarioService = calendarioServiceDependency;
    this.#conversaService = conversaServiceDependency;
    this.#mensagemService = mensagemServiceDependency;
    this.#conteudoService = conteudoServiceDependency;
    this.#avisoService = avisoServiceDependency;
    this.#anexoService = anexoServiceDependency;
    this.#notificacaoService = notificacaoServiceDependency;
    this.#anotacaoService = anotacaoServiceDependency;
    this.#projetoService = projetoServiceDependency;
    this.#categoriaConteudoService = categoriaConteudoServiceDependency;
    this.#pendenciaService = pendenciaServiceDependency;
    this.#grupoTarefaService = grupoTarefaServiceDependency;
    this.#alocacaoDAO = alocacaoDAODependency;
    this.#matriculaDAO = matriculaDAODependency;
    this.#materiaDAO = materiaDAODependency;
    this.#turmaDAO = turmaDAODependency;
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

    const { sessionId, sessao } = await this.#prepararSessaoWhatsapp(telefoneRemetente);

    const resposta = await getAssistenteAgent().responder(
      sessao.historico,
      mensagem.trim(),
      () => this.#construirFerramentas(sessao)
    );

    return { sessionId, resposta };
  };

  /**
   * Variante do canal WhatsApp pra quando a mensagem traz um arquivo (imagem
   * ou PDF). O binário fica pendente na sessão até uma ferramenta de escrita
   * consumi-lo (ex.: enviar_atividade). Se o usuário não tiver legenda, o
   * texto é sintetizado só pra o modelo saber que chegou um arquivo.
   */
  enviarMensagemWhatsappComAnexo = async (
    telefoneRemetente: string,
    mensagem: string,
    arquivo: { buffer: Buffer; mimetype: string; fileName: string }
  ): Promise<EnviarMensagemResultado> => {
    console.log("🟢 ChatbotService.enviarMensagemWhatsappComAnexo()");

    const { sessionId, sessao } = await this.#prepararSessaoWhatsapp(telefoneRemetente);
    sessao.anexoPendente = arquivo;

    const texto = mensagem.trim() || `[o usuário enviou um arquivo: ${arquivo.fileName}]`;
    const resposta = await getAssistenteAgent().responder(
      sessao.historico,
      texto,
      () => this.#construirFerramentas(sessao)
    );

    return { sessionId, resposta };
  };

  /**
   * Resolve/cria a sessão do número, faz a pré-identificação por telefone e
   * semeia o histórico na primeira mensagem — parte comum das duas entradas
   * do canal WhatsApp.
   */
  #prepararSessaoWhatsapp = async (
    telefoneRemetente: string
  ): Promise<{ sessionId: string; sessao: ChatbotSessao }> => {
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

    return { sessionId, sessao };
  };

  #criarSessaoVazia = (): ChatbotSessao => ({
    historico: [],
    usuarioGUID: null,
    escolaGUID: null,
    funcoes: [],
    escolasDisponiveis: [],
    conversasCache: [],
    tarefasCache: [],
    alocacoesCache: [],
    avisosCache: [],
    projetosCache: [],
    provasCache: [],
    materiasCache: [],
    anexoPendente: null,
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

      // ESCRITA — enviar mensagem numa conversa do usuário. Duas etapas: sem
      // `confirmado` faz só a validação e devolve o que vai acontecer; com
      // `confirmado === true` executa de fato (ver SYSTEM_INSTRUCTION).
      handlers.responder_conversa = async (args) => {
        const conversaGUID = String(args.conversaGUID ?? "");
        const texto = String(args.texto ?? "").trim();
        const confirmado = args.confirmado === true;

        const alvo = sessao.conversasCache.find((c) => c.ConversaGUID === conversaGUID);
        if (!alvo) {
          return { error: "ConversaGUID não corresponde a nenhuma conversa listada — chame consultar_conversas primeiro" };
        }
        if (!texto) {
          return { error: "texto da mensagem vazio" };
        }
        if (texto.length > 2000) {
          return { error: "mensagem longa demais (máx. 2000 caracteres)" };
        }

        if (!confirmado) {
          return { precisaConfirmacao: true, acao: `enviar a mensagem "${texto}" na conversa "${alvo.nome}"` };
        }

        await this.#mensagemService.enviar(conversaGUID, usuarioGUID, texto, "Texto");
        return { ok: true, enviadaEm: alvo.nome };
      };

      // Comunicados/avisos recebidos.
      handlers.consultar_avisos = async () => {
        const avisos = await this.#avisoService.listarAvisos(escolaGUID, usuarioGUID);
        sessao.avisosCache = avisos.map((a) => ({ AvisoGUID: a.AvisoGUID, titulo: a.AvisoTitulo }));
        return {
          avisos: avisos.slice(0, 20).map((a) => ({
            AvisoGUID: a.AvisoGUID,
            titulo: a.AvisoTitulo,
            abrangencia: a.AvisoAbrangencia,
            quando: a.AvisoCreatedAt instanceof Date ? a.AvisoCreatedAt.toISOString() : String(a.AvisoCreatedAt),
          })),
        };
      };

      handlers.ver_detalhe_aviso = async (args) => {
        const avisoGUID = String(args.avisoGUID ?? "");
        const alvo = sessao.avisosCache.find((a) => a.AvisoGUID === avisoGUID);
        if (!alvo) {
          return { error: "AvisoGUID não corresponde a nenhum aviso listado — chame consultar_avisos primeiro" };
        }
        const aviso = await this.#avisoService.buscarAviso(avisoGUID, usuarioGUID);
        return {
          titulo: aviso.AvisoTitulo,
          texto: aviso.AvisoConteudo,
          abrangencia: aviso.AvisoAbrangencia,
          anexos: (aviso.Anexos ?? []).map((x: any) => ({ nome: x.AnexoNomeOriginal, url: x.AnexoCaminho })),
        };
      };

      handlers.consultar_notificacoes = async (args) => {
        const apenasNaoLidas = args.apenasNaoLidas === true;
        const lista = await this.#notificacaoService.listar(usuarioGUID, {
          EscolaGUID: escolaGUID,
          limit: 20,
          ...(apenasNaoLidas ? { lida: false } : {}),
        });
        return {
          notificacoes: lista.map((n: any) => ({
            titulo: n.NotificacaoTitulo,
            texto: n.NotificacaoConteudo ?? undefined,
            lida: n.NotificacaoLida,
            quando: n.NotificacaoCreatedAt instanceof Date ? n.NotificacaoCreatedAt.toISOString() : String(n.NotificacaoCreatedAt),
          })),
        };
      };

      handlers.consultar_anotacoes = async () => {
        const lista = await this.#anotacaoService.listarAnotacoesUsuario(usuarioGUID, escolaGUID);
        return {
          anotacoes: lista.map((a: any) => ({
            titulo: a.AnotacaoTitulo,
            texto: a.AnotacaoDescricao ?? undefined,
            data: a.AnotacaoData instanceof Date ? a.AnotacaoData.toISOString().slice(0, 10) : String(a.AnotacaoData).slice(0, 10),
            feito: a.AnotacaoIsFeito,
          })),
        };
      };

      handlers.consultar_projetos = async () => {
        const lista = await this.#projetoService.listarProjetos(escolaGUID, usuarioGUID);
        sessao.projetosCache = lista.map((p: any) => ({ ProjetoGUID: p.ProjetoGUID, nome: p.ProjetoTitulo }));
        return {
          projetos: lista.map((p: any) => ({
            ProjetoGUID: p.ProjetoGUID,
            titulo: p.ProjetoTitulo,
            status: p.ProjetoStatus,
            prazoInscricao: p.ProjetoInscricaoPrazoData instanceof Date ? p.ProjetoInscricaoPrazoData.toISOString().slice(0, 10) : undefined,
          })),
        };
      };

      handlers.ver_detalhe_projeto = async (args) => {
        const projetoGUID = String(args.projetoGUID ?? "");
        const alvo = sessao.projetosCache.find((p) => p.ProjetoGUID === projetoGUID);
        if (!alvo) {
          return { error: "ProjetoGUID não corresponde a nenhum projeto listado — chame consultar_projetos primeiro" };
        }
        const p: any = await this.#projetoService.buscarProjeto(projetoGUID);
        return {
          titulo: p.ProjetoTitulo,
          descricao: p.ProjetoDescricao,
          status: p.ProjetoStatus,
          publicoAlvo: p.ProjetoPublicoAlvo,
          grupo: { min: p.ProjetoGrupoMinPessoas, max: p.ProjetoGrupoMaxPessoas },
          prazoInscricao: p.ProjetoInscricaoPrazoData instanceof Date ? p.ProjetoInscricaoPrazoData.toISOString().slice(0, 10) : undefined,
          prazoEntrega: p.ProjetoEntregaPrazoData instanceof Date ? p.ProjetoEntregaPrazoData.toISOString().slice(0, 10) : undefined,
        };
      };

      // Provas agendadas — fonte é o calendário do aluno (escopado por vínculo).
      handlers.consultar_provas = async (args) => {
        const hoje = new Date();
        const dataInicio = this.#parseDataOuPadrao(args.dataInicio, hoje);
        const padraoFim = new Date(hoje);
        padraoFim.setDate(padraoFim.getDate() + 60);
        const dataFim = this.#parseDataOuPadrao(args.dataFim, padraoFim);

        const avisos = await this.#calendarioService.buscarCalendario(usuarioGUID, escolaGUID, {
          DataInicio: dataInicio,
          DataFim: dataFim,
          TipoAviso: "prova",
        });

        sessao.provasCache = avisos.map((a) => ({ ProvaAgendadaGUID: a.AvisoId, titulo: a.Titulo }));
        return {
          provas: avisos.map((a) => ({
            ProvaAgendadaGUID: a.AvisoId,
            titulo: a.Titulo,
            data: new Date(a.DataPrazo).toISOString().slice(0, 10),
            descricao: a.Descricao ?? undefined,
          })),
        };
      };

      handlers.ver_recomendacao_prova = async (args) => {
        const provaGUID = String(args.provaGUID ?? "");
        const alvo = sessao.provasCache.find((p) => p.ProvaAgendadaGUID === provaGUID);
        if (!alvo) {
          return { error: "ProvaAgendadaGUID não corresponde a nenhuma prova listada — chame consultar_provas primeiro" };
        }

        let rec: RecomendacaoDTO;
        try {
          rec = await getProvaAgendadaRecomendacaoService().buscarRecomendacao(provaGUID);
        } catch {
          return { prova: alvo.titulo, status: "ainda não disponível", detalhe: "A recomendação de estudo dessa prova ainda não foi gerada ou está sendo processada." };
        }

        if (rec.StatusGeracao !== "Concluida") {
          return { prova: alvo.titulo, status: rec.StatusGeracao === "Falhou" ? "não foi possível gerar" : "em processamento" };
        }

        return {
          prova: alvo.titulo,
          status: "pronta",
          resumo: rec.Resumo ?? undefined,
          videos: rec.Videos.map((v) => ({ titulo: v.titulo, canal: v.canal, url: v.url })),
          paginaLivro: rec.PaginaLivro
            ? `${rec.PaginaLivro.materialDidaticoTitulo} — ${rec.PaginaLivro.capituloTitulo}, p. ${rec.PaginaLivro.paginaInicio}–${rec.PaginaLivro.paginaFim}`
            : undefined,
          temExerciciosParaPraticar: !!rec.SubMateriaGlobalGUID,
        };
      };

      handlers.consultar_pendencias = async (args) => {
        const incluirConcluidas = args.incluirConcluidas === true;
        // O service já faz o gate: quem não é Coord/Sec/Dir só vê as próprias.
        const lista = await this.#pendenciaService.index(
          { EscolaGUID: escolaGUID, limit: 30, ...(incluirConcluidas ? {} : { PendenciaFeito: false }) },
          usuarioGUID
        );
        return {
          pendencias: lista.map((p) => ({
            titulo: p.PendenciaTitulo,
            detalhe: p.PendenciaConteudo ?? undefined,
            prazo: p.PendenciaPrazoData instanceof Date ? p.PendenciaPrazoData.toISOString().slice(0, 10) : String(p.PendenciaPrazoData).slice(0, 10),
            feito: p.PendenciaFeito,
          })),
        };
      };

      // Auditoria: dado administrativo sensível — só staff.
      if (sessao.funcoes.some((f) => ["Coordenacao", "Direcao", "Secretaria"].includes(f))) {
        handlers.consultar_auditoria = async (args) => {
          const entidadeTipo = args.entidadeTipo ? String(args.entidadeTipo) : undefined;
          const registros = await getAuditoriaService().listar(escolaGUID, {
            limit: 20,
            ...(entidadeTipo ? { EntidadeTipo: entidadeTipo } : {}),
          });
          return {
            registros: registros.map((r) => ({
              acao: r.AcaoTipo,
              entidade: r.EntidadeTipo,
              descricao: r.EntidadeDescricao ?? undefined,
              ator: r.UsuarioNomeAtor ?? "(desconhecido)",
              quando: r.CreatedAt instanceof Date ? r.CreatedAt.toISOString() : String(r.CreatedAt),
            })),
          };
        };
      }

      // Ferramentas de aluno.
      if (sessao.funcoes.includes("Aluno")) {
        handlers.consultar_tarefas = async () => {
          const tarefas = await this.#tarefaService.listarPendentesAluno(usuarioGUID, escolaGUID);
          sessao.tarefasCache = tarefas.map((t) => ({ TarefaGUID: t.TarefaGUID, titulo: t.TarefaTitulo }));
          return { tarefas };
        };

        handlers.consultar_materias = async () => {
          const materias = await this.#materiaService.listarMateriasDoAluno(usuarioGUID, escolaGUID);
          sessao.materiasCache = materias.map((m) => ({ MateriaGUID: m.MateriaGUID, TurmaGUID: m.TurmaGUID, nome: m.MateriaNome }));
          return {
            materias: materias.map((m) => ({ MateriaGUID: m.MateriaGUID, MateriaNome: m.MateriaNome, ProfessorNome: m.ProfessorNome })),
          };
        };

        handlers.ver_conteudos_materia = async (args) => {
          const materiaGUID = String(args.materiaGUID ?? "");
          const alvo = sessao.materiasCache.find((m) => m.MateriaGUID === materiaGUID);
          if (!alvo) {
            return { error: "MateriaGUID não corresponde a nenhuma matéria listada — chame consultar_materias primeiro" };
          }

          const board = await this.#categoriaConteudoService.buscarCategoriasCompletas(materiaGUID, alvo.TurmaGUID, usuarioGUID);
          const mapItem = (i: any) => ({
            tipo: this.#rotularTipoItem(i.Tipo),
            titulo: i.Titulo,
            estado: i.Estado,
            nota: i.Nota ?? undefined,
            percentual: i.Percentual ?? undefined,
          });

          return {
            materia: alvo.nome,
            categorias: board.categorias.map((c) => ({ nome: c.CategoriaNome || "(sem nome)", itens: c.Itens.map(mapItem) })),
            semCategoria: board.itensSemCategoria.map(mapItem),
          };
        };

        // ESCRITA — marcar tarefa pendente como feita. Mesmo padrão de duas
        // etapas do responder_conversa.
        handlers.marcar_tarefa_feita = async (args) => {
          const tarefaGUID = String(args.tarefaGUID ?? "");
          const confirmado = args.confirmado === true;

          const alvo = sessao.tarefasCache.find((t) => t.TarefaGUID === tarefaGUID);
          if (!alvo) {
            return { error: "TarefaGUID não corresponde a nenhuma tarefa listada — chame consultar_tarefas primeiro" };
          }

          if (!confirmado) {
            return { precisaConfirmacao: true, acao: `marcar a tarefa "${alvo.titulo}" como feita` };
          }

          await this.#tarefaService.marcarComoFeitoPorUsuario(tarefaGUID, usuarioGUID, true);
          // A tarefa deixou de ser pendente — tira do cache pra não marcar 2x.
          sessao.tarefasCache = sessao.tarefasCache.filter((t) => t.TarefaGUID !== tarefaGUID);
          return { ok: true, tarefa: alvo.titulo };
        };

        // ESCRITA — enviar o arquivo recebido pelo WhatsApp como entrega de
        // uma tarefa digital. Consome sessao.anexoPendente.
        handlers.enviar_atividade = async (args) => {
          const tarefaGUID = String(args.tarefaGUID ?? "");
          const confirmado = args.confirmado === true;

          if (!sessao.anexoPendente) {
            return { error: "nenhum arquivo recebido — peça pro usuário enviar o arquivo (imagem ou PDF) pelo WhatsApp primeiro" };
          }
          const alvo = sessao.tarefasCache.find((t) => t.TarefaGUID === tarefaGUID);
          if (!alvo) {
            return { error: "TarefaGUID não corresponde a nenhuma tarefa listada — chame consultar_tarefas primeiro" };
          }

          if (!confirmado) {
            return {
              precisaConfirmacao: true,
              acao: `enviar o arquivo "${sessao.anexoPendente.fileName}" como entrega da tarefa "${alvo.titulo}"`,
            };
          }

          const arquivo = sessao.anexoPendente;
          const pseudoFile = {
            buffer: arquivo.buffer,
            originalname: arquivo.fileName,
            mimetype: arquivo.mimetype,
            size: arquivo.buffer.length,
          } as Express.Multer.File;

          const anexo = await this.#anexoService.uploadAnexo(pseudoFile, escolaGUID, usuarioGUID);
          await this.#tarefaService.enviarAnexoEntrega(tarefaGUID, anexo.AnexoGUID, usuarioGUID);

          sessao.anexoPendente = null;
          // Entregar a tarefa também a marca como feita — sai da lista de pendentes.
          sessao.tarefasCache = sessao.tarefasCache.filter((t) => t.TarefaGUID !== tarefaGUID);
          return { ok: true, tarefa: alvo.titulo, arquivo: arquivo.fileName };
        };

        handlers.ver_detalhe_tarefa = async (args) => {
          const tarefaGUID = String(args.tarefaGUID ?? "");
          const alvo = sessao.tarefasCache.find((t) => t.TarefaGUID === tarefaGUID);
          if (!alvo) {
            return { error: "TarefaGUID não corresponde a nenhuma tarefa listada — chame consultar_tarefas primeiro" };
          }
          const t = await this.#tarefaService.buscarTarefa(tarefaGUID, usuarioGUID);
          const minha = t.MatriculasAtribuidas?.[0];
          return {
            titulo: t.TarefaTitulo,
            enunciado: t.TarefaConteudo ?? undefined,
            materia: t.MateriaNome ?? undefined,
            turma: t.TurmaNome ?? t.GrupoEletivoNome ?? undefined,
            prazo: t.TarefaPrazoData,
            tipoEntrega: t.TarefaTipoEntrega,
            materiaisApoio: (t.AnexosDescricao ?? []).map((x) => ({ nome: x.AnexoNomeOriginal })),
            minhaEntrega: minha
              ? {
                  feito: minha.TarefaFeito,
                  nota: minha.TarefaNota ?? undefined,
                  avaliadaEm: minha.TarefaAvaliadoEm ?? undefined,
                  anexosEnviados: (minha.AnexosEntrega ?? []).map((x: any) => ({ nome: x.AnexoNomeOriginal })),
                }
              : undefined,
          };
        };

        handlers.consultar_grupos_tarefa = async (args) => {
          const tarefaGUID = String(args.tarefaGUID ?? "");
          const alvo = sessao.tarefasCache.find((t) => t.TarefaGUID === tarefaGUID);
          if (!alvo) {
            return { error: "TarefaGUID não corresponde a nenhuma tarefa listada — chame consultar_tarefas primeiro" };
          }
          const grupos = await this.#grupoTarefaService.listarGruposDaTarefa(tarefaGUID, usuarioGUID);
          return {
            tarefa: alvo.titulo,
            grupos: grupos.map((g) => ({
              nome: g.GrupoNome ?? `Grupo de ${g.NomeLider}`,
              lider: g.NomeLider,
              membros: g.Membros.map((m) => m.UsuarioNome),
              total: g.TotalMembros,
              limite: g.LimiteMaximo,
              souMembro: g.Membros.some((m) => m.UsuarioGUID === usuarioGUID),
            })),
          };
        };
      }

      // Ferramentas de professor.
      if (sessao.funcoes.includes("Professor")) {
        handlers.listar_minhas_turmas = async () => {
          const alocacoes = await this.#alocacaoDAO.findByProfessor(usuarioGUID);
          const ativas = alocacoes.filter((a) => a.AlocacaoStatus === "Ativa" && a.TurmaGUID);

          const enriquecidas = (
            await Promise.all(
              ativas.map(async (a) => {
                const [materia, turma] = await Promise.all([
                  this.#materiaDAO.findById(a.MateriaGUID),
                  this.#turmaDAO.findById(a.TurmaGUID as string),
                ]);
                // Escopo por escola vem da turma (a alocação não carrega EscolaGUID).
                if (!turma || turma.EscolaGUID !== escolaGUID) return null;
                return {
                  MatProfTurGUID: a.MatProfTurGUID,
                  MateriaGUID: a.MateriaGUID,
                  TurmaGUID: a.TurmaGUID as string,
                  materia: materia?.MateriaNome ?? "(matéria)",
                  turma: `${turma.TurmaSerie ?? ""} ${turma.TurmaNome ?? ""}`.trim() || "(turma)",
                };
              })
            )
          ).filter((e): e is AlocacaoCache => e !== null);

          sessao.alocacoesCache = enriquecidas;
          return {
            turmas: enriquecidas.map((e) => ({ alocacaoId: e.MatProfTurGUID, materia: e.materia, turma: e.turma })),
          };
        };

        // ESCRITA — criar tarefa e atribuir a todos os alunos ativos da turma.
        handlers.criar_tarefa = async (args) => {
          const alocacaoId = String(args.alocacaoId ?? "");
          const titulo = String(args.titulo ?? "").trim();
          const descricao = args.descricao ? String(args.descricao).trim() : undefined;
          const tipoEntradaBruto = String(args.tipoEntrega ?? "digital").toLowerCase();
          const confirmado = args.confirmado === true;

          const alvo = sessao.alocacoesCache.find((a) => a.MatProfTurGUID === alocacaoId);
          if (!alvo) {
            return { error: "alocacaoId não corresponde a nenhuma turma sua — chame listar_minhas_turmas primeiro" };
          }
          if (!titulo) return { error: "título da tarefa vazio" };
          if (tipoEntradaBruto !== "digital" && tipoEntradaBruto !== "fisica") {
            return { error: 'tipoEntrega deve ser "digital" ou "fisica" (tarefa tipo "lista" ainda não é suportada pelo chatbot)' };
          }
          const prazo = this.#parseDataHora(args.prazo);
          if (!prazo) return { error: "prazo inválido — use o formato AAAA-MM-DDTHH:MM" };
          if (prazo.getTime() <= Date.now()) return { error: "o prazo precisa ser no futuro" };

          const matriculas = (await this.#matriculaDAO.findByTurma(alvo.TurmaGUID)).filter(
            (m) => m.MatriculaStatus === "Ativa"
          );
          if (matriculas.length === 0) {
            return { error: `a turma ${alvo.turma} não tem alunos ativos` };
          }

          if (!confirmado) {
            return {
              precisaConfirmacao: true,
              acao:
                `criar a tarefa "${titulo}" em ${alvo.turma} (${alvo.materia}), ` +
                `prazo ${prazo.toISOString().slice(0, 16).replace("T", " ")}, entrega ${tipoEntradaBruto}, ` +
                `para ${matriculas.length} aluno(s)`,
            };
          }

          await this.#tarefaService.criarTarefa(
            {
              MatriculasGUID: matriculas.map((m) => m.MatriculaGUID),
              matXprofXturxescGUID: alocacaoId,
              TarefaTitulo: titulo,
              TarefaConteudo: descricao,
              TarefaPrazoData: prazo,
              TarefaTipoEntrega: tipoEntradaBruto as "digital" | "fisica",
            },
            usuarioGUID
          );
          return { ok: true, tarefa: titulo, turma: alvo.turma, alunos: matriculas.length };
        };

        // ESCRITA — publicar material de aula (tipo texto) numa turma.
        handlers.criar_conteudo_aula = async (args) => {
          const alocacaoId = String(args.alocacaoId ?? "");
          const titulo = String(args.titulo ?? "").trim();
          const texto = String(args.texto ?? "").trim();
          const descricao = args.descricao ? String(args.descricao).trim() : undefined;
          const confirmado = args.confirmado === true;

          const alvo = sessao.alocacoesCache.find((a) => a.MatProfTurGUID === alocacaoId);
          if (!alvo) {
            return { error: "alocacaoId não corresponde a nenhuma turma sua — chame listar_minhas_turmas primeiro" };
          }
          if (!titulo) return { error: "título do material vazio" };
          if (!texto) return { error: "texto do material vazio" };

          if (!confirmado) {
            return { precisaConfirmacao: true, acao: `publicar o material "${titulo}" em ${alvo.turma} (${alvo.materia})` };
          }

          const html = texto
            .split(/\n{2,}/)
            .map((p) => `<p>${p.trim().replace(/\n/g, "<br>")}</p>`)
            .join("");

          await this.#conteudoService.criarConteudo(
            {
              MateriaGUID: alvo.MateriaGUID,
              ConteudoTitulo: titulo,
              ConteudoTipo: "texto",
              TurmasGUID: [alvo.TurmaGUID],
              ConteudoDataPublicacao: new Date(),
              ConteudoDescricao: descricao,
              ConteudoHtml: html,
            },
            {},
            usuarioGUID
          );
          return { ok: true, material: titulo, turma: alvo.turma };
        };
      }

      // Ferramentas de coordenação/direção/secretaria (o AvisoService revalida).
      if (sessao.funcoes.some((f) => ["Coordenacao", "Direcao", "Secretaria"].includes(f))) {
        handlers.enviar_comunicado = async (args) => {
          const titulo = String(args.titulo ?? "").trim();
          const texto = String(args.texto ?? "").trim();
          const confirmado = args.confirmado === true;

          if (!titulo) return { error: "título do comunicado vazio" };
          if (titulo.length > 150) return { error: "título longo demais (máx. 150 caracteres)" };
          if (!texto) return { error: "texto do comunicado vazio" };
          if (texto.length > 4000) return { error: "comunicado longo demais (máx. 4000 caracteres)" };

          if (!confirmado) {
            return { precisaConfirmacao: true, acao: `enviar o comunicado "${titulo}" para toda a escola` };
          }

          await this.#avisoService.criarAviso({
            EscolaGUID: escolaGUID,
            UsuarioGUIDAutor: usuarioGUID,
            AvisoTitulo: titulo,
            AvisoConteudo: texto,
            AvisoAbrangencia: "Escola",
          });
          return { ok: true, comunicado: titulo };
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

  #rotularTipoItem = (tipo: string): string => {
    if (tipo.startsWith("tarefa")) return tipo === "tarefa_lista" ? "tarefa (lista)" : "tarefa";
    if (tipo.startsWith("conteudo")) return "material";
    if (tipo === "prova") return "prova";
    return tipo;
  };

  /** Aceita "AAAA-MM-DDTHH:MM", "AAAA-MM-DD HH:MM" ou "AAAA-MM-DD" (meia-noite). */
  #parseDataHora = (valor: unknown): Date | null => {
    if (typeof valor !== "string") return null;
    const v = valor.trim();
    let iso: string | null = null;
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(v)) iso = v.replace(" ", "T");
    else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) iso = `${v}T00:00:00`;
    if (!iso) return null;
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  };
}
