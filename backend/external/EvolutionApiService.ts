/**
 * 📵 Serviço de Envio de WhatsApp via Evolution API
 *
 * Evolution API é um gateway self-hosted (Docker) sobre o protocolo do
 * WhatsApp Web/Baileys — diferente da Resend, não é um SaaS com API key só;
 * precisa de uma instância rodando e pareada com um número real via QR code
 * antes de qualquer envio funcionar. Ver docs/PLANO_IMPLEMENTACAO_NOTIFICACAO_WHATSAPP.md.
 *
 * @example
 * ```typescript
 * const whatsapp = EvolutionApiService.getInstance();
 * await whatsapp.sendText('5512996945757', 'Olá!');
 * ```
 */

interface SendTextResponse {
  id: string;
  /**
   * `true` = confirmado entregue via `/chat/findMessages`. `false` = falhou
   * (status ERROR) mesmo após reenvio automático. `undefined` = não foi
   * possível confirmar (sem `id`, ou resposta de verificação inconclusiva).
   */
  entregue?: boolean;
}

type StatusEntrega = "DELIVERED" | "ERROR" | "UNKNOWN";

export interface GrupoWhatsapp {
  jid: string;
  nome: string;
  tamanho: number;
}

export class EvolutionApiService {
  private static instance: EvolutionApiService;

  /**
   * Instabilidade conhecida e não resolvida do Baileys (lib que a Evolution
   * API usa por baixo): o socket reconecta sozinho a cada ~10-15min
   * (`stream:error code:503`, ver github.com/WhiskeySockets/Baileys/issues/2060).
   * Uma mensagem enviada bem na janela da reconexão falha silenciosamente
   * (a API retorna sucesso, mas o `MessageUpdate` real fica ERROR) — por isso
   * verificamos a entrega e reenviamos 1x antes de desistir.
   */
  static readonly #VERIFICACAO_DELAY_MS = 6000;

  readonly #baseUrl: string;
  readonly #instanceName: string;
  readonly #apiKey: string;

  private constructor() {
    this.#baseUrl = (process.env.EVOLUTION_API_URL || '').replace(/\/+$/, '');
    this.#instanceName = process.env.EVOLUTION_INSTANCE_NAME || '';
    this.#apiKey = process.env.EVOLUTION_API_KEY || '';

    if (!this.#baseUrl || !this.#instanceName || !this.#apiKey) {
      console.error('❌ [EvolutionApiService] EVOLUTION_API_URL/EVOLUTION_INSTANCE_NAME/EVOLUTION_API_KEY não configuradas no .env');
      throw new Error(
        'EVOLUTION_API_URL, EVOLUTION_INSTANCE_NAME e EVOLUTION_API_KEY são obrigatórios.\n' +
        'Ver docs/PLANO_IMPLEMENTACAO_NOTIFICACAO_WHATSAPP.md.'
      );
    }

    const maskedKey = this.#apiKey.length > 8
      ? `${this.#apiKey.substring(0, 4)}...${this.#apiKey.substring(this.#apiKey.length - 4)}`
      : '***';
    console.log(`✅ [EvolutionApiService] Inicializado (instância: ${this.#instanceName}, chave: ${maskedKey})`);
  }

  /**
   * Obtém a instância única do serviço (Singleton)
   */
  public static getInstance(): EvolutionApiService {
    if (!EvolutionApiService.instance) {
      EvolutionApiService.instance = new EvolutionApiService();
    }
    return EvolutionApiService.instance;
  }

  /**
   * Envia uma mensagem de texto via WhatsApp e confirma a entrega real
   * (não só o retorno 200 da API). Se a verificação encontrar status ERROR
   * — sintoma da instabilidade de conexão descrita acima — reenvia
   * automaticamente 1x antes de reportar falha.
   *
   * @param numero - DDI + DDD + número, só dígitos (ex.: "5512996945757")
   * @param texto - Corpo da mensagem (texto puro, sem HTML)
   * @throws Error se a chamada à API falhar (não lança por falha de entrega)
   */
  public async sendText(numero: string, texto: string): Promise<SendTextResponse> {
    const primeiraTentativa = await this.#enviarBruto(numero, texto);
    if (!primeiraTentativa.id) {
      return primeiraTentativa;
    }

    const statusInicial = await this.#verificarEntrega(primeiraTentativa.id);
    if (statusInicial !== 'ERROR') {
      return { ...primeiraTentativa, entregue: statusInicial === 'DELIVERED' ? true : undefined };
    }

    console.warn(
      `⚠️ [EvolutionApiService] Mensagem ${primeiraTentativa.id} não entregue (ERROR) — ` +
        `provável janela de reconexão do stream Baileys. Reenviando 1x...`
    );

    const segundaTentativa = await this.#enviarBruto(numero, texto);
    if (!segundaTentativa.id) {
      return segundaTentativa;
    }

    const statusFinal = await this.#verificarEntrega(segundaTentativa.id);
    if (statusFinal === 'ERROR') {
      console.error(`❌ [EvolutionApiService] Reenvio também falhou (ERROR). ID: ${segundaTentativa.id}. Requer envio manual.`);
      return { ...segundaTentativa, entregue: false };
    }

    console.log(`✅ [EvolutionApiService] Reenvio confirmado. ID: ${segundaTentativa.id}`);
    return { ...segundaTentativa, entregue: statusFinal === 'DELIVERED' ? true : undefined };
  }

  /**
   * Envia texto SEM confirmar entrega (sem os 6-12s de `#verificarEntrega` +
   * reenvio de `sendText`) — pra uso em conversas ao vivo (chatbot), onde
   * responsividade importa mais do que a garantia de entrega que a fila de
   * notificação precisa. Custo aceito: uma falha rara e silenciosa da janela
   * de reconexão do Baileys (ver comentário de `#VERIFICACAO_DELAY_MS`) não é
   * detectada nem reenviada aqui — na prática, o usuário só manda de novo.
   */
  public async sendTextRapido(numero: string, texto: string): Promise<SendTextResponse> {
    return this.#enviarBruto(numero, texto);
  }

  async #enviarBruto(numero: string, texto: string): Promise<SendTextResponse> {
    console.log(`📵 [EvolutionApiService] Enviando WhatsApp para: ${numero.slice(0, 4)}${'*'.repeat(Math.max(numero.length - 6, 0))}${numero.slice(-2)}`);

    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}/message/sendText/${this.#instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.#apiKey,
        },
        body: JSON.stringify({ number: numero, text: texto }),
      });
    } catch (erroInesperado: any) {
      console.error('❌ [EvolutionApiService] Erro inesperado ao chamar a Evolution API:', erroInesperado);
      throw new Error(`Falha ao enviar WhatsApp via Evolution API: ${erroInesperado.message}`);
    }

    const data: any = await response.json().catch(() => null);

    if (!response.ok) {
      const mensagemErro = data?.message ?? data?.response?.message ?? response.statusText;
      console.error('❌ [EvolutionApiService] Erro retornado pela Evolution API:', mensagemErro);
      throw new Error(`Falha ao enviar WhatsApp via Evolution API: ${mensagemErro}`);
    }

    const id = data?.key?.id ?? '';
    console.log(`📤 [EvolutionApiService] WhatsApp aceito pela API. ID: ${id}`);
    return { id };
  }

  /**
   * Aguarda a Evolution API processar o ACK e consulta o status real da
   * mensagem. `UNKNOWN` (sem registro encontrado ainda) NÃO é tratado como
   * erro — evita reenvio duplicado por falso negativo de timing.
   */
  async #verificarEntrega(messageId: string): Promise<StatusEntrega> {
    await new Promise((resolve) => setTimeout(resolve, EvolutionApiService.#VERIFICACAO_DELAY_MS));

    try {
      // Filtra só por key.id (único por mensagem enviada) — NÃO por remoteJid:
      // o WhatsApp normaliza alguns números (ex.: remove o 9º dígito extra em
      // DDDs que ainda usam 8 dígitos), então o remoteJid que a gente formatou
      // pra envio pode não bater com o remoteJid real armazenado, causando
      // falso "não encontrado" mesmo com a mensagem entregue.
      const response = await fetch(`${this.#baseUrl}/chat/findMessages/${this.#instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.#apiKey,
        },
        body: JSON.stringify({ where: { key: { id: messageId } } }),
      });
      const data: any = await response.json().catch(() => null);
      const registro = data?.messages?.records?.find((mensagem: any) => mensagem?.key?.id === messageId);
      const statuses: string[] = (registro?.MessageUpdate ?? []).map((atualizacao: any) => atualizacao?.status);

      if (statuses.includes('ERROR')) return 'ERROR';
      if (statuses.length > 0) return 'DELIVERED';
      return 'UNKNOWN';
    } catch (erro: any) {
      console.error('⚠️ [EvolutionApiService] Falha ao verificar status de entrega:', erro?.message ?? erro);
      return 'UNKNOWN';
    }
  }

  /**
   * Cria um grupo de WhatsApp com os participantes informados e retorna o
   * JID do grupo criado (`...@g.us`). Usado pela criação automática de
   * grupo por turma — ver docs/spec-resumo-ia-prova-grupo-whatsapp.md
   * (repo interceptacaoAVA).
   *
   * @param nome - Nome/assunto do grupo (ex.: "3º A")
   * @param telefones - DDI+DDD+número, só dígitos, um por participante
   * @throws Error se a API falhar ou não retornar um JID
   */
  public async criarGrupo(nome: string, telefones: string[]): Promise<{ jid: string }> {
    console.log(`📵 [EvolutionApiService] Criando grupo "${nome}" com ${telefones.length} participante(s)`);

    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}/group/create/${this.#instanceName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: this.#apiKey },
        body: JSON.stringify({ subject: nome, participants: telefones }),
      });
    } catch (erro: any) {
      throw new Error(`Falha ao criar grupo via Evolution API: ${erro?.message ?? erro}`);
    }

    const data: any = await response.json().catch(() => null);
    if (!response.ok) {
      const mensagemErro = data?.message ?? data?.response?.message ?? response.statusText;
      throw new Error(`Evolution API não conseguiu criar o grupo: ${mensagemErro}`);
    }

    // A resposta varia por versão da Evolution API — tenta os formatos conhecidos.
    const jid = data?.id ?? data?.groupJid ?? data?.group?.id ?? null;
    if (!jid) {
      throw new Error("Evolution API criou o grupo mas não retornou o JID (resposta em formato inesperado).");
    }

    console.log(`✅ [EvolutionApiService] Grupo criado: ${jid}`);
    return { jid };
  }

  /**
   * Lista todos os grupos em que a instância (o BAUÁ) está presente —
   * usado no fallback de vínculo manual (buscar grupo já existente pra
   * linkar a uma turma).
   */
  public async listarGrupos(): Promise<GrupoWhatsapp[]> {
    console.log(`📵 [EvolutionApiService] Listando grupos da instância`);

    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}/group/fetchAllGroups/${this.#instanceName}?getParticipants=false`, {
        method: "GET",
        headers: { apikey: this.#apiKey },
      });
    } catch (erro: any) {
      throw new Error(`Falha ao listar grupos via Evolution API: ${erro?.message ?? erro}`);
    }

    const data: any = await response.json().catch(() => null);
    if (!response.ok) {
      const mensagemErro = data?.message ?? data?.response?.message ?? response.statusText;
      throw new Error(`Evolution API não conseguiu listar os grupos: ${mensagemErro}`);
    }

    const grupos = Array.isArray(data) ? data : [];
    return grupos.map((g: any) => ({
      jid: g.id,
      nome: g.subject ?? "",
      tamanho: g.size ?? 0,
    }));
  }

  /**
   * Adiciona ou remove participantes de um grupo já existente — usado pra
   * sincronizar membro (aluno entrou na turma, ou teve o telefone cadastrado
   * depois de já estar matriculado) e pra remover quem saiu/foi transferido.
   * Nunca lança se a Evolution API responder com sucesso mesmo que algum
   * participante individual já estivesse no estado desejado (idempotente
   * do lado da própria API).
   *
   * @param grupoJID - JID do grupo (`...@g.us`)
   * @param telefones - DDI+DDD+número, só dígitos, um por participante
   * @param acao - "add" ou "remove"
   */
  public async atualizarParticipantesGrupo(
    grupoJID: string,
    telefones: string[],
    acao: "add" | "remove"
  ): Promise<void> {
    if (telefones.length === 0) return;

    console.log(
      `📵 [EvolutionApiService] ${acao === "add" ? "Adicionando" : "Removendo"} ${telefones.length} participante(s) no grupo ${grupoJID}`
    );

    let response: Response;
    try {
      response = await fetch(
        `${this.#baseUrl}/group/updateParticipant/${this.#instanceName}?groupJid=${encodeURIComponent(grupoJID)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", apikey: this.#apiKey },
          body: JSON.stringify({ action: acao, participants: telefones }),
        }
      );
    } catch (erro: any) {
      throw new Error(`Falha ao atualizar participantes do grupo via Evolution API: ${erro?.message ?? erro}`);
    }

    const data: any = await response.json().catch(() => null);
    if (!response.ok) {
      const mensagemErro = data?.message ?? data?.response?.message ?? response.statusText;
      throw new Error(`Evolution API não conseguiu atualizar participantes do grupo: ${mensagemErro}`);
    }
  }

  /** Adiciona um único participante — atalho de `atualizarParticipantesGrupo`. */
  public async adicionarParticipante(grupoJID: string, telefone: string): Promise<void> {
    await this.atualizarParticipantesGrupo(grupoJID, [telefone], "add");
  }

  /** Remove um único participante — atalho de `atualizarParticipantesGrupo`. */
  public async removerParticipante(grupoJID: string, telefone: string): Promise<void> {
    await this.atualizarParticipantesGrupo(grupoJID, [telefone], "remove");
  }

  /**
   * Baixa o conteúdo binário de uma mensagem de mídia recebida (imagem,
   * documento, etc.) via `/chat/getBase64FromMediaMessage`. Recebe o objeto
   * `message` cru do webhook (a Evolution precisa dele inteiro, não só a key)
   * e devolve o buffer já decodificado + metadados.
   *
   * @throws Error se a API falhar ou não retornar base64.
   */
  public async baixarMidiaBase64(
    mensagemWebhook: unknown
  ): Promise<{ buffer: Buffer; mimetype: string; fileName: string }> {
    let response: Response;
    try {
      response = await fetch(`${this.#baseUrl}/chat/getBase64FromMediaMessage/${this.#instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: this.#apiKey },
        body: JSON.stringify({ message: mensagemWebhook, convertToMp4: false }),
      });
    } catch (erro: any) {
      throw new Error(`Falha ao baixar mídia da Evolution API: ${erro?.message ?? erro}`);
    }

    const data: any = await response.json().catch(() => null);
    if (!response.ok || !data?.base64) {
      const msg = data?.message ?? data?.response?.message ?? response.statusText;
      throw new Error(`Evolution API não retornou a mídia: ${msg}`);
    }

    return {
      buffer: Buffer.from(data.base64, 'base64'),
      mimetype: data.mimetype ?? 'application/octet-stream',
      fileName: data.fileName ?? 'arquivo',
    };
  }
}

export default EvolutionApiService;
