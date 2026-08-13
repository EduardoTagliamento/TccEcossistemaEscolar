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
}

export class EvolutionApiService {
  private static instance: EvolutionApiService;

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
   * Envia uma mensagem de texto via WhatsApp.
   *
   * @param numero - DDI + DDD + número, só dígitos (ex.: "5512996945757")
   * @param texto - Corpo da mensagem (texto puro, sem HTML)
   * @throws Error se o envio falhar
   */
  public async sendText(numero: string, texto: string): Promise<SendTextResponse> {
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
    console.log(`✅ [EvolutionApiService] WhatsApp enviado com sucesso. ID: ${id}`);
    return { id };
  }
}

export default EvolutionApiService;
