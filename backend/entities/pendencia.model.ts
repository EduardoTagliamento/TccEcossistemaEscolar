/**
 * 📋 Entidade Pendência
 * 
 * Representa lembretes/pendências administrativas/pedagógicas com resposta.
 * 
 * Regras de negócio:
 * - Criado por: Coordenação, Direção ou Secretaria
 * - Direcionado para: qualquer usuário da escola
 * - PendenciaFeito: boolean (marcar como feito pelo destinatário)
 * - PendenciaRealizacaoData: data de conclusão (automática ao marcar como feito)
 * 
 * Relacionamentos:
 * - N:1 com Usuario (destinatário)
 * - N:1 com Escola
 */

export default class Pendencia {
  // Campos privados (encapsulamento)
  #PendenciaGUID!: string;
  #UsuarioCPF!: string;
  #EscolaGUID!: string;
  #PendenciaTitulo!: string;
  #PendenciaConteudo!: string | null;
  #PendenciaPostagemData!: Date;
  #PendenciaPrazoData!: Date;
  #PendenciaFeito!: boolean;
  #PendenciaRealizacaoData!: Date | null;
  #PendenciaCreatedAt!: Date;
  #PendenciaUpdatedAt!: Date;

  // ==================== GETTERS ====================

  get PendenciaGUID(): string {
    return this.#PendenciaGUID;
  }

  get UsuarioCPF(): string {
    return this.#UsuarioCPF;
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  get PendenciaTitulo(): string {
    return this.#PendenciaTitulo;
  }

  get PendenciaConteudo(): string | null {
    return this.#PendenciaConteudo;
  }

  get PendenciaPostagemData(): Date {
    return this.#PendenciaPostagemData;
  }

  get PendenciaPrazoData(): Date {
    return this.#PendenciaPrazoData;
  }

  get PendenciaFeito(): boolean {
    return this.#PendenciaFeito;
  }

  get PendenciaRealizacaoData(): Date | null {
    return this.#PendenciaRealizacaoData;
  }

  get PendenciaCreatedAt(): Date {
    return this.#PendenciaCreatedAt;
  }

  get PendenciaUpdatedAt(): Date {
    return this.#PendenciaUpdatedAt;
  }

  // ==================== SETTERS ====================

  set PendenciaGUID(value: string) {
    if (typeof value !== 'string') {
      throw new Error('PendenciaGUID deve ser uma string');
    }
    const trimmed = value.trim();
    if (trimmed.length !== 36) {
      throw new Error('PendenciaGUID deve ter 36 caracteres (UUID v4)');
    }
    this.#PendenciaGUID = trimmed;
  }

  set UsuarioCPF(value: string) {
    if (typeof value !== 'string') {
      throw new Error('UsuarioCPF deve ser uma string');
    }
    const cpfLimpo = value.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPF deve ter 11 dígitos');
    }
    this.#UsuarioCPF = value;
  }

  set EscolaGUID(value: string) {
    if (typeof value !== 'string') {
      throw new Error('EscolaGUID deve ser uma string');
    }
    const trimmed = value.trim();
    if (trimmed.length !== 36) {
      throw new Error('EscolaGUID deve ter 36 caracteres (UUID v4)');
    }
    this.#EscolaGUID = trimmed;
  }

  set PendenciaTitulo(value: string) {
    if (typeof value !== 'string') {
      throw new Error('PendenciaTitulo deve ser uma string');
    }
    const trimmed = value.trim();
    if (trimmed.length < 3 || trimmed.length > 128) {
      throw new Error('PendenciaTitulo deve ter entre 3 e 128 caracteres');
    }
    this.#PendenciaTitulo = trimmed;
  }

  set PendenciaConteudo(value: string | null) {
    if (value === null || value === undefined) {
      this.#PendenciaConteudo = null;
      return;
    }
    if (typeof value !== 'string') {
      throw new Error('PendenciaConteudo deve ser uma string ou null');
    }
    const trimmed = value.trim();
    if (trimmed.length > 1024) {
      throw new Error('PendenciaConteudo deve ter no máximo 1024 caracteres');
    }
    this.#PendenciaConteudo = trimmed.length > 0 ? trimmed : null;
  }

  set PendenciaPostagemData(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('PendenciaPostagemData deve ser uma data válida');
    }
    this.#PendenciaPostagemData = value;
  }

  set PendenciaPrazoData(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('PendenciaPrazoData deve ser uma data válida');
    }
    this.#PendenciaPrazoData = value;
  }

  set PendenciaFeito(value: boolean) {
    if (typeof value !== 'boolean') {
      throw new Error('PendenciaFeito deve ser um booleano');
    }
    this.#PendenciaFeito = value;
  }

  set PendenciaRealizacaoData(value: Date | null) {
    if (value === null || value === undefined) {
      this.#PendenciaRealizacaoData = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('PendenciaRealizacaoData deve ser uma data válida ou null');
    }
    this.#PendenciaRealizacaoData = value;
  }

  set PendenciaCreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('PendenciaCreatedAt deve ser uma data válida');
    }
    this.#PendenciaCreatedAt = value;
  }

  set PendenciaUpdatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('PendenciaUpdatedAt deve ser uma data válida');
    }
    this.#PendenciaUpdatedAt = value;
  }

  // ==================== MÉTODOS ====================

  /**
   * Validação completa da entidade
   */
  validar(): void {
    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(this.#PendenciaGUID)) {
      throw new Error('PendenciaGUID inválido');
    }
    if (!uuidRegex.test(this.#EscolaGUID)) {
      throw new Error('EscolaGUID inválido');
    }

    // Validar CPF
    const cpfLimpo = this.#UsuarioCPF.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPF deve ter 11 dígitos');
    }

    // Validar título
    if (this.#PendenciaTitulo.length < 3) {
      throw new Error('PendenciaTitulo muito curto (mínimo 3 caracteres)');
    }

    // Validar conteúdo
    if (this.#PendenciaConteudo && this.#PendenciaConteudo.length > 1024) {
      throw new Error('PendenciaConteudo muito longo (máximo 1024 caracteres)');
    }

    // Validar lógica de negócio
    if (this.#PendenciaFeito && !this.#PendenciaRealizacaoData) {
      throw new Error('PendenciaRealizacaoData é obrigatória quando PendenciaFeito = true');
    }

    if (!this.#PendenciaFeito && this.#PendenciaRealizacaoData) {
      throw new Error('PendenciaRealizacaoData deve ser null quando PendenciaFeito = false');
    }
  }

  /**
   * Marcar pendência como feita
   */
  marcarComoFeita(): void {
    this.#PendenciaFeito = true;
    this.#PendenciaRealizacaoData = new Date();
    this.#PendenciaUpdatedAt = new Date();
  }

  /**
   * Verificar se está atrasada
   */
  estaAtrasada(): boolean {
    if (this.#PendenciaFeito) {
      return false;
    }
    return new Date() > this.#PendenciaPrazoData;
  }

  /**
   * Converter para objeto JSON
   */
  toJSON(): {
    PendenciaGUID: string;
    UsuarioCPF: string;
    EscolaGUID: string;
    PendenciaTitulo: string;
    PendenciaConteudo: string | null;
    PendenciaPostagemData: Date;
    PendenciaPrazoData: Date;
    PendenciaFeito: boolean;
    PendenciaRealizacaoData: Date | null;
    PendenciaCreatedAt: Date;
    PendenciaUpdatedAt: Date;
  } {
    return {
      PendenciaGUID: this.#PendenciaGUID,
      UsuarioCPF: this.#UsuarioCPF,
      EscolaGUID: this.#EscolaGUID,
      PendenciaTitulo: this.#PendenciaTitulo,
      PendenciaConteudo: this.#PendenciaConteudo,
      PendenciaPostagemData: this.#PendenciaPostagemData,
      PendenciaPrazoData: this.#PendenciaPrazoData,
      PendenciaFeito: this.#PendenciaFeito,
      PendenciaRealizacaoData: this.#PendenciaRealizacaoData,
      PendenciaCreatedAt: this.#PendenciaCreatedAt,
      PendenciaUpdatedAt: this.#PendenciaUpdatedAt
    };
  }

  /**
   * Criar instância a partir de objeto plano
   */
  static fromPlainObject(data: any): Pendencia {
    const pendencia = new Pendencia();
    pendencia.PendenciaGUID = data.PendenciaGUID;
    pendencia.UsuarioCPF = data.UsuarioCPF;
    pendencia.EscolaGUID = data.EscolaGUID;
    pendencia.PendenciaTitulo = data.PendenciaTitulo;
    pendencia.PendenciaConteudo = data.PendenciaConteudo;
    pendencia.PendenciaPostagemData = data.PendenciaPostagemData instanceof Date 
      ? data.PendenciaPostagemData 
      : new Date(data.PendenciaPostagemData);
    pendencia.PendenciaPrazoData = data.PendenciaPrazoData instanceof Date 
      ? data.PendenciaPrazoData 
      : new Date(data.PendenciaPrazoData);
    pendencia.PendenciaFeito = Boolean(data.PendenciaFeito);
    pendencia.PendenciaRealizacaoData = data.PendenciaRealizacaoData 
      ? (data.PendenciaRealizacaoData instanceof Date 
        ? data.PendenciaRealizacaoData 
        : new Date(data.PendenciaRealizacaoData))
      : null;
    pendencia.PendenciaCreatedAt = data.PendenciaCreatedAt instanceof Date 
      ? data.PendenciaCreatedAt 
      : new Date(data.PendenciaCreatedAt);
    pendencia.PendenciaUpdatedAt = data.PendenciaUpdatedAt instanceof Date 
      ? data.PendenciaUpdatedAt 
      : new Date(data.PendenciaUpdatedAt);
    
    pendencia.validar();
    return pendencia;
  }
}
