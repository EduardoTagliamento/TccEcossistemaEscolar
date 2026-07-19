export type ProjetoPublicoAlvo = 'Escola' | 'Turmas';
export type ProjetoStatus = 'Aberto' | 'Encerrado';

export interface Projeto {
  ProjetoGUID: string;
  EscolaGUID: string;
  UsuarioCPFCriador: string;
  ProjetoTitulo: string;
  ProjetoDescricao: string;
  ProjetoMecanicaPontuacao: string | null;
  ProjetoPublicoAlvo: ProjetoPublicoAlvo;
  ProjetoGrupoMinPessoas: number;
  ProjetoGrupoMaxPessoas: number;
  ProjetoInscricaoPrazoData: Date;
  ProjetoEntregaPrazoData: Date | null;
  ProjetoStatus: ProjetoStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ProjetoCreateDTO {
  EscolaGUID: string;
  ProjetoTitulo: string;
  ProjetoDescricao: string;
  ProjetoMecanicaPontuacao?: string;
  ProjetoPublicoAlvo: ProjetoPublicoAlvo;
  TurmasGUID?: string[];
  ProjetoGrupoMinPessoas: number;
  ProjetoGrupoMaxPessoas: number;
  ProjetoInscricaoPrazoData: string;
  ProjetoEntregaPrazoData?: string;
}

export interface ProjetoUpdateDTO {
  ProjetoTitulo?: string;
  ProjetoDescricao?: string;
  ProjetoMecanicaPontuacao?: string | null;
  ProjetoGrupoMinPessoas?: number;
  ProjetoGrupoMaxPessoas?: number;
  ProjetoInscricaoPrazoData?: string;
  ProjetoEntregaPrazoData?: string | null;
}

export interface ProjetoDTO extends Projeto {
  NomeCriador: string;
  TurmasGUID: string[];
  TotalGrupos: number;
}

/**
 * Classe Entity com encapsulamento e validações
 */
export class ProjetoEntity {
  #projetoGUID: string;
  #escolaGUID: string;
  #usuarioCPFCriador: string;
  #projetoTitulo: string;
  #projetoDescricao: string;
  #projetoMecanicaPontuacao: string | null;
  #projetoPublicoAlvo: ProjetoPublicoAlvo;
  #projetoGrupoMinPessoas: number;
  #projetoGrupoMaxPessoas: number;
  #projetoInscricaoPrazoData: Date;
  #projetoEntregaPrazoData: Date | null;
  #projetoStatus: ProjetoStatus;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(data: Projeto) {
    this.#projetoGUID = data.ProjetoGUID;
    this.#escolaGUID = data.EscolaGUID;
    this.#usuarioCPFCriador = data.UsuarioCPFCriador;
    this.#projetoTitulo = data.ProjetoTitulo;
    this.#projetoDescricao = data.ProjetoDescricao;
    this.#projetoMecanicaPontuacao = data.ProjetoMecanicaPontuacao;
    this.#projetoPublicoAlvo = data.ProjetoPublicoAlvo;
    this.#projetoGrupoMinPessoas = data.ProjetoGrupoMinPessoas;
    this.#projetoGrupoMaxPessoas = data.ProjetoGrupoMaxPessoas;
    this.#projetoInscricaoPrazoData = data.ProjetoInscricaoPrazoData;
    this.#projetoEntregaPrazoData = data.ProjetoEntregaPrazoData;
    this.#projetoStatus = data.ProjetoStatus;
    this.#createdAt = data.CreatedAt;
    this.#updatedAt = data.UpdatedAt;
  }

  get projetoGUID(): string { return this.#projetoGUID; }
  get escolaGUID(): string { return this.#escolaGUID; }
  get usuarioCPFCriador(): string { return this.#usuarioCPFCriador; }
  get projetoTitulo(): string { return this.#projetoTitulo; }
  get projetoDescricao(): string { return this.#projetoDescricao; }
  get projetoMecanicaPontuacao(): string | null { return this.#projetoMecanicaPontuacao; }
  get projetoPublicoAlvo(): ProjetoPublicoAlvo { return this.#projetoPublicoAlvo; }
  get projetoGrupoMinPessoas(): number { return this.#projetoGrupoMinPessoas; }
  get projetoGrupoMaxPessoas(): number { return this.#projetoGrupoMaxPessoas; }
  get projetoInscricaoPrazoData(): Date { return this.#projetoInscricaoPrazoData; }
  get projetoEntregaPrazoData(): Date | null { return this.#projetoEntregaPrazoData; }
  get projetoStatus(): ProjetoStatus { return this.#projetoStatus; }
  get createdAt(): Date { return this.#createdAt; }
  get updatedAt(): Date { return this.#updatedAt; }

  set projetoTitulo(value: string) {
    if (!value || value.trim().length < 1 || value.trim().length > 128) {
      throw new Error('ProjetoTitulo deve ter entre 1 e 128 caracteres');
    }
    this.#projetoTitulo = value.trim();
  }

  set projetoStatus(value: ProjetoStatus) {
    const statusValidos: ProjetoStatus[] = ['Aberto', 'Encerrado'];
    if (!statusValidos.includes(value)) {
      throw new Error(`ProjetoStatus inválido: ${value}`);
    }
    this.#projetoStatus = value;
  }

  validar(): void {
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(this.#projetoGUID)) {
      throw new Error('ProjetoGUID inválido (deve ser UUID v4)');
    }

    const cpfLimpo = this.#usuarioCPFCriador.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFCriador deve ter 11 dígitos');
    }

    if (!this.#projetoTitulo || this.#projetoTitulo.length < 1 || this.#projetoTitulo.length > 128) {
      throw new Error('ProjetoTitulo deve ter entre 1 e 128 caracteres');
    }

    if (!this.#projetoDescricao || this.#projetoDescricao.length < 1 || this.#projetoDescricao.length > 2048) {
      throw new Error('ProjetoDescricao deve ter entre 1 e 2048 caracteres');
    }

    const publicoValidos: ProjetoPublicoAlvo[] = ['Escola', 'Turmas'];
    if (!publicoValidos.includes(this.#projetoPublicoAlvo)) {
      throw new Error(`ProjetoPublicoAlvo inválido: ${this.#projetoPublicoAlvo}`);
    }

    if (this.#projetoGrupoMinPessoas < 1) {
      throw new Error('ProjetoGrupoMinPessoas deve ser >= 1');
    }

    if (this.#projetoGrupoMaxPessoas < this.#projetoGrupoMinPessoas) {
      throw new Error('ProjetoGrupoMaxPessoas deve ser >= ProjetoGrupoMinPessoas');
    }

    const statusValidos: ProjetoStatus[] = ['Aberto', 'Encerrado'];
    if (!statusValidos.includes(this.#projetoStatus)) {
      throw new Error(`ProjetoStatus inválido: ${this.#projetoStatus}`);
    }
  }

  toJSON(): Projeto {
    return {
      ProjetoGUID: this.#projetoGUID,
      EscolaGUID: this.#escolaGUID,
      UsuarioCPFCriador: this.#usuarioCPFCriador,
      ProjetoTitulo: this.#projetoTitulo,
      ProjetoDescricao: this.#projetoDescricao,
      ProjetoMecanicaPontuacao: this.#projetoMecanicaPontuacao,
      ProjetoPublicoAlvo: this.#projetoPublicoAlvo,
      ProjetoGrupoMinPessoas: this.#projetoGrupoMinPessoas,
      ProjetoGrupoMaxPessoas: this.#projetoGrupoMaxPessoas,
      ProjetoInscricaoPrazoData: this.#projetoInscricaoPrazoData,
      ProjetoEntregaPrazoData: this.#projetoEntregaPrazoData,
      ProjetoStatus: this.#projetoStatus,
      CreatedAt: this.#createdAt,
      UpdatedAt: this.#updatedAt
    };
  }
}
