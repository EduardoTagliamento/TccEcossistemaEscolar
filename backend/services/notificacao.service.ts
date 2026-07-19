/**
 * 🔔 Service - Notificacao
 *
 * Ponto único de entrada pra disparar notificações no sistema. Chamado no
 * fim dos métodos de criação já existentes (TarefaAcademicaService,
 * ProvaAgendadaService, ConteudoService, PendenciaService, EventoService,
 * etc.) — ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md, seção 3.
 *
 * disparar() nunca lança erro: uma falha aqui (banco fora do ar, e-mail
 * falhando, etc.) nunca pode derrubar a ação principal do usuário que
 * originou a notificação.
 */

import { v4 as uuidv4 } from "uuid";
import MysqlDatabase from "../database/MysqlDatabase";
import { NotificacaoDAO, NotificacaoFilters } from "../repositories/notificacao.repository";
import { NotificacaoTipoDAO } from "../repositories/notificacaotipo.repository";
import { UsuarioNotificacaoPreferenciaDAO } from "../repositories/usuarionotificacaopreferencia.repository";
import { NotificacaoEnvioDAO } from "../repositories/notificacaoenvio.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import Notificacao from "../entities/notificacao.model";
import NotificacaoTipo from "../entities/notificacaotipo.model";
import UsuarioNotificacaoPreferencia from "../entities/usuarionotificacaopreferencia.model";
import NotificacaoEmailChannel from "./notificacaocanal/notificacaoEmail.channel";
import NotificacaoWhatsappChannel from "./notificacaocanal/notificacaoWhatsapp.channel";
import { SocketServer } from "../websocket/SocketServer";
import ErrorResponse from "../utils/ErrorResponse";

export interface DisparoNotificacaoInput {
  tipoSlug: string;
  destinatarios: string[]; // UsuarioCPF[]
  escolaGUID: string;
  titulo: string;
  conteudo?: string | null;
  entidadeTipo?: string | null;
  entidadeGUID?: string | null;
  link?: string | null;
}

export default class NotificacaoService {
  #notificacaoDAO: NotificacaoDAO;
  #tipoDAO: NotificacaoTipoDAO;
  #preferenciaDAO: UsuarioNotificacaoPreferenciaDAO;
  #envioDAO: NotificacaoEnvioDAO;
  #usuarioDAO: UsuarioDAO;
  #emailChannel: NotificacaoEmailChannel;
  #whatsappChannel: NotificacaoWhatsappChannel;
  #catalogoPorSlug: Map<string, NotificacaoTipo> | null = null;

  constructor(
    notificacaoDAO: NotificacaoDAO,
    tipoDAO: NotificacaoTipoDAO,
    preferenciaDAO: UsuarioNotificacaoPreferenciaDAO,
    envioDAO: NotificacaoEnvioDAO,
    usuarioDAO: UsuarioDAO,
    emailChannel: NotificacaoEmailChannel = new NotificacaoEmailChannel(),
    whatsappChannel: NotificacaoWhatsappChannel = new NotificacaoWhatsappChannel()
  ) {
    console.log("🔔 NotificacaoService.constructor()");
    this.#notificacaoDAO = notificacaoDAO;
    this.#tipoDAO = tipoDAO;
    this.#preferenciaDAO = preferenciaDAO;
    this.#envioDAO = envioDAO;
    this.#usuarioDAO = usuarioDAO;
    this.#emailChannel = emailChannel;
    this.#whatsappChannel = whatsappChannel;
  }

  /**
   * Dispara uma notificação para um ou mais destinatários. Cria o registro
   * do feed in-app de forma síncrona (rápido, só INSERT) e despacha os
   * canais de e-mail/whatsapp em segundo plano (não bloqueia o caller).
   */
  async disparar(input: DisparoNotificacaoInput): Promise<void> {
    console.log(`🔔 NotificacaoService.disparar() - tipo=${input.tipoSlug} destinatarios=${input.destinatarios.length}`);

    try {
      const tipo = await this.#resolverTipo(input.tipoSlug);
      if (!tipo || !tipo.NotificacaoTipoAtivo) {
        console.warn(`🔔 NotificacaoService.disparar() - tipo '${input.tipoSlug}' inexistente ou inativo, ignorando`);
        return;
      }

      const destinatariosUnicos = [...new Set(input.destinatarios)];

      for (const usuarioCPF of destinatariosUnicos) {
        await this.#dispararParaUsuario(usuarioCPF, tipo, input);
      }
    } catch (error) {
      console.error("🔴 NotificacaoService.disparar() falhou (não propagado):", error);
    }
  }

  async #dispararParaUsuario(usuarioCPF: string, tipo: NotificacaoTipo, input: DisparoNotificacaoInput): Promise<void> {
    try {
      const notificacao = new Notificacao();
      notificacao.NotificacaoGUID = uuidv4();
      notificacao.NotificacaoTipoId = tipo.NotificacaoTipoId;
      notificacao.UsuarioCPF = usuarioCPF;
      notificacao.EscolaGUID = input.escolaGUID;
      notificacao.NotificacaoTitulo = input.titulo;
      notificacao.NotificacaoConteudo = input.conteudo ?? null;
      notificacao.NotificacaoEntidadeTipo = input.entidadeTipo ?? null;
      notificacao.NotificacaoEntidadeGUID = input.entidadeGUID ?? null;
      notificacao.NotificacaoLink = input.link ?? null;
      notificacao.NotificacaoLida = false;
      notificacao.NotificacaoLidaData = null;
      notificacao.NotificacaoCreatedAt = new Date();

      const criada = await this.#notificacaoDAO.create(notificacao);

      this.#emitirTempoReal(criada);

      // Canais de e-mail/whatsapp: nunca aguardado pelo caller, e qualquer
      // falha fica isolada nessa promise (não deve nem pode subir).
      this.#despacharCanais(criada, tipo).catch((error) => {
        console.error(`🔴 NotificacaoService.#despacharCanais() falhou para ${usuarioCPF}:`, error);
      });
    } catch (error) {
      console.error(`🔴 NotificacaoService.#dispararParaUsuario() falhou para ${usuarioCPF}:`, error);
    }
  }

  #emitirTempoReal(notificacao: Notificacao): void {
    try {
      SocketServer.emit(`usuario:${notificacao.UsuarioCPF}`, "notificacao:nova", notificacao.toJSON());
    } catch (error) {
      console.error("🔴 NotificacaoService.#emitirTempoReal() falhou:", error);
    }
  }

  async #despacharCanais(notificacao: Notificacao, tipo: NotificacaoTipo): Promise<void> {
    const preferencia = await this.#resolverPreferencia(notificacao.UsuarioCPF, tipo);

    if (preferencia.email) {
      await this.#despacharEmail(notificacao);
    }
    if (preferencia.whatsapp) {
      const usuario = await this.#usuarioDAO.findByCPF(notificacao.UsuarioCPF);
      await this.#whatsappChannel.enviar(usuario?.UsuarioTelefone ?? null, notificacao);
    }
  }

  async #despacharEmail(notificacao: Notificacao): Promise<void> {
    const envioId = await this.#envioDAO.criarPendente(notificacao.NotificacaoGUID, "Email");
    if (envioId === null) {
      // Já existe um envio registrado pra essa notificação+canal (idempotência)
      return;
    }

    try {
      const usuario = await this.#usuarioDAO.findByCPF(notificacao.UsuarioCPF);
      if (!usuario?.UsuarioEmail) {
        await this.#envioDAO.marcarFalhou(envioId, "Usuário sem e-mail cadastrado");
        return;
      }

      const resultado = await this.#emailChannel.enviar(usuario.UsuarioEmail, usuario.UsuarioNome, notificacao);
      await this.#envioDAO.marcarEnviado(envioId, resultado.id);
    } catch (error: any) {
      await this.#envioDAO.marcarFalhou(envioId, error?.message ?? String(error));
    }
  }

  async #resolverPreferencia(usuarioCPF: string, tipo: NotificacaoTipo): Promise<{ email: boolean; whatsapp: boolean }> {
    const override = await this.#preferenciaDAO.findByUsuarioETipo(usuarioCPF, tipo.NotificacaoTipoId);
    if (override) {
      return { email: override.PreferenciaEmailAtivo, whatsapp: override.PreferenciaWhatsappAtivo };
    }
    return { email: tipo.NotificacaoTipoEmailPadrao, whatsapp: tipo.NotificacaoTipoWhatsappPadrao };
  }

  async #resolverTipo(slug: string): Promise<NotificacaoTipo | null> {
    if (!this.#catalogoPorSlug) {
      const tipos = await this.#tipoDAO.findAll();
      this.#catalogoPorSlug = new Map(tipos.map((tipo) => [tipo.NotificacaoTipoSlug, tipo]));
    }
    return this.#catalogoPorSlug.get(slug) ?? null;
  }

  /** Força releitura do catálogo (só necessário se o catálogo for editado em runtime) */
  invalidarCache(): void {
    this.#catalogoPorSlug = null;
  }

  // ==================== LEITURA DO FEED (sino) ====================

  async listar(usuarioCPF: string, filters: NotificacaoFilters = {}): Promise<Notificacao[]> {
    console.log("🔔 NotificacaoService.listar()");
    return this.#notificacaoDAO.findAllByUsuario(usuarioCPF, filters);
  }

  async contarNaoLidas(usuarioCPF: string): Promise<number> {
    console.log("🔔 NotificacaoService.contarNaoLidas()");
    return this.#notificacaoDAO.contarNaoLidas(usuarioCPF);
  }

  async marcarComoLida(notificacaoGUID: string, usuarioCPF: string): Promise<Notificacao> {
    console.log("🔔 NotificacaoService.marcarComoLida()");
    return this.#notificacaoDAO.marcarComoLida(notificacaoGUID, usuarioCPF);
  }

  async marcarTodasComoLidas(usuarioCPF: string): Promise<number> {
    console.log("🔔 NotificacaoService.marcarTodasComoLidas()");
    return this.#notificacaoDAO.marcarTodasComoLidas(usuarioCPF);
  }

  /**
   * Remove da lista de destinatários quem já recebeu esse tipo+entidade hoje.
   * Uso: jobs de lembrete (cron), que rodam diariamente e não podem
   * duplicar o aviso se o processo for reiniciado/reexecutado no mesmo dia.
   */
  async filtrarNaoNotificadosHoje(usuarioCPFs: string[], tipoSlug: string, entidadeGUID: string): Promise<string[]> {
    const tipo = await this.#resolverTipo(tipoSlug);
    if (!tipo) {
      return usuarioCPFs;
    }
    const jaNotificados = new Set(await this.#notificacaoDAO.findUsuariosNotificadosHoje(tipo.NotificacaoTipoId, entidadeGUID));
    return usuarioCPFs.filter((cpf) => !jaNotificados.has(cpf));
  }

  // ==================== CATÁLOGO E PREFERÊNCIAS ====================

  async listarTipos(): Promise<Array<ReturnType<NotificacaoTipo["toJSON"]> & { FuncaoIds: number[] }>> {
    console.log("🔔 NotificacaoService.listarTipos()");

    const [tipos, funcaoMap] = await Promise.all([
      this.#tipoDAO.findAll(),
      this.#tipoDAO.findFuncaoIdsPorTipo(),
    ]);

    return tipos.map((tipo) => ({
      ...tipo.toJSON(),
      FuncaoIds: funcaoMap.get(tipo.NotificacaoTipoId) ?? [],
    }));
  }

  /**
   * Preferências efetivas do usuário: pra cada tipo do catálogo, o valor
   * vigente (override do usuário, se existir, senão o padrão do catálogo).
   */
  async listarPreferencias(usuarioCPF: string): Promise<Array<{
    NotificacaoTipoId: number;
    NotificacaoTipoSlug: string;
    NotificacaoTipoDescricao: string;
    NotificacaoTipoCategoria: string;
    PreferenciaEmailAtivo: boolean;
    PreferenciaWhatsappAtivo: boolean;
    Origem: "padrao" | "usuario";
  }>> {
    console.log("🔔 NotificacaoService.listarPreferencias()");

    const [tipos, overrides] = await Promise.all([
      this.#tipoDAO.findAll(),
      this.#preferenciaDAO.findByUsuario(usuarioCPF),
    ]);

    const overridePorTipo = new Map(overrides.map((o) => [o.NotificacaoTipoId, o]));

    return tipos.map((tipo) => {
      const override = overridePorTipo.get(tipo.NotificacaoTipoId);
      return {
        NotificacaoTipoId: tipo.NotificacaoTipoId,
        NotificacaoTipoSlug: tipo.NotificacaoTipoSlug,
        NotificacaoTipoDescricao: tipo.NotificacaoTipoDescricao,
        NotificacaoTipoCategoria: tipo.NotificacaoTipoCategoria,
        PreferenciaEmailAtivo: override ? override.PreferenciaEmailAtivo : tipo.NotificacaoTipoEmailPadrao,
        PreferenciaWhatsappAtivo: override ? override.PreferenciaWhatsappAtivo : tipo.NotificacaoTipoWhatsappPadrao,
        Origem: override ? "usuario" : "padrao",
      };
    });
  }

  async atualizarPreferencia(
    usuarioCPF: string,
    notificacaoTipoId: number,
    emailAtivo: boolean,
    whatsappAtivo: boolean
  ): Promise<UsuarioNotificacaoPreferencia> {
    console.log("🔔 NotificacaoService.atualizarPreferencia()");

    const tipo = await this.#tipoDAO.findById(notificacaoTipoId);
    if (!tipo) {
      throw new ErrorResponse(404, "Tipo de notificação não encontrado");
    }

    const preferencia = new UsuarioNotificacaoPreferencia();
    preferencia.UsuarioCPF = usuarioCPF;
    preferencia.NotificacaoTipoId = notificacaoTipoId;
    preferencia.PreferenciaEmailAtivo = emailAtivo;
    preferencia.PreferenciaWhatsappAtivo = whatsappAtivo;
    preferencia.UpdatedAt = new Date();

    return this.#preferenciaDAO.upsert(preferencia);
  }
}

/**
 * Singleton leve pra uso a partir de outros services (hooks de disparo).
 *
 * O projeto normalmente monta as dependências via injeção manual em cada
 * `*.routes.ts` (uma instância nova de cada DAO/service por router factory).
 * Notificação é uma dependência transversal — quase todo service de escrita
 * (tarefa, prova, conteúdo, pendência, evento, convite, grupo, mensagem...)
 * precisa dela só pra chamar `disparar()` no final de um método já existente.
 * Forçar a mesma injeção manual em cada um desses services e em cada routes
 * factory infla a plumbing sem trazer benefício (não há estado por-request
 * aqui, só DAOs sobre o mesmo pool MySQL compartilhado). Por isso, hooks
 * devem importar `getNotificacaoService()` em vez de receber o service via
 * construtor.
 */
let instanciaSingleton: NotificacaoService | null = null;

export function getNotificacaoService(): NotificacaoService {
  if (!instanciaSingleton) {
    const database = new MysqlDatabase();
    instanciaSingleton = new NotificacaoService(
      new NotificacaoDAO(database),
      new NotificacaoTipoDAO(database),
      new UsuarioNotificacaoPreferenciaDAO(database),
      new NotificacaoEnvioDAO(database),
      new UsuarioDAO(database)
    );
  }
  return instanciaSingleton;
}
