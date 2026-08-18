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

    const statusInicial = await this.#verificarEntrega(numero, primeiraTentativa.id);
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

    const statusFinal = await this.#verificarEntrega(numero, segundaTentativa.id);
    if (statusFinal === 'ERROR') {
      console.error(`❌ [EvolutionApiService] Reenvio também falhou (ERROR). ID: ${segundaTentativa.id}. Requer envio manual.`);
      return { ...segundaTentativa, entregue: false };
    }

    console.log(`✅ [EvolutionApiService] Reenvio confirmado. ID: ${segundaTentativa.id}`);
    return { ...segundaTentativa, entregue: statusFinal === 'DELIVERED' ? true : undefined };
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
  async #verificarEntrega(numero: string, messageId: string): Promise<StatusEntrega> {
    await new Promise((resolve) => setTimeout(resolve, EvolutionApiService.#VERIFICACAO_DELAY_MS));

    try {
      const remoteJid = `${numero}@s.whatsapp.net`;
      const response = await fetch(`${this.#baseUrl}/chat/findMessages/${this.#instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.#apiKey,
        },
        body: JSON.stringify({ where: { key: { id: messageId, remoteJid } } }),
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
}

export default EvolutionApiService;
