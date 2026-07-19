export type ConviteTipo = 'Convite' | 'Solicitacao';
export type ConviteStatus = 'Pendente' | 'Aceito' | 'Recusado';

export interface ConviteGrupoProjeto {
  ConviteGUID: string;
  GrupoProjetoGUID: string;
  UsuarioCPFConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ConviteGrupoProjetoCreateDTO {
  GrupoProjetoGUID: string;
  UsuarioCPFConvidado: string;
  ConviteTipo: ConviteTipo;
}

export interface ConviteGrupoProjetoDTO {
  ConviteGUID: string;
  GrupoProjetoGUID: string;
  GrupoProjetoNome: string | null;
  LiderCPF: string;
  LiderNome: string;
  UsuarioCPFConvidado: string;
  NomeConvidado: string;
  ConviteTipo: ConviteTipo;
  ConviteStatus: ConviteStatus;
  ProjetoTitulo: string;
  ProjetoInscricaoPrazoData: string;
  TotalMembros: number;
  MaxPessoas: number;
  CreatedAt: Date;
}

export class ConviteGrupoProjetoEntity {
  #conviteGUID: string;
  #grupoProjetoGUID: string;
  #usuarioCPFConvidado: string;
  #conviteTipo: ConviteTipo;
  #conviteStatus: ConviteStatus;
  #createdAt: Date;
  #updatedAt: Date;

  constructor(data: ConviteGrupoProjeto) {
    this.#conviteGUID = data.ConviteGUID;
    this.#grupoProjetoGUID = data.GrupoProjetoGUID;
    this.#usuarioCPFConvidado = data.UsuarioCPFConvidado;
    this.#conviteTipo = data.ConviteTipo;
    this.#conviteStatus = data.ConviteStatus;
    this.#createdAt = data.CreatedAt;
    this.#updatedAt = data.UpdatedAt;
  }

  get conviteGUID(): string { return this.#conviteGUID; }
  get grupoProjetoGUID(): string { return this.#grupoProjetoGUID; }
  get usuarioCPFConvidado(): string { return this.#usuarioCPFConvidado; }
  get conviteTipo(): ConviteTipo { return this.#conviteTipo; }
  get conviteStatus(): ConviteStatus { return this.#conviteStatus; }
  get createdAt(): Date { return this.#createdAt; }
  get updatedAt(): Date { return this.#updatedAt; }

  set conviteStatus(value: ConviteStatus) {
    const statusValidos: ConviteStatus[] = ['Pendente', 'Aceito', 'Recusado'];
    if (!statusValidos.includes(value)) {
      throw new Error(`ConviteStatus inválido: ${value}`);
    }
    this.#conviteStatus = value;
  }

  validar(): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#conviteGUID)) {
      throw new Error('ConviteGUID inválido');
    }

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.#grupoProjetoGUID)) {
      throw new Error('GrupoProjetoGUID inválido');
    }

    const cpfLimpo = this.#usuarioCPFConvidado.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new Error('UsuarioCPFConvidado deve ter 11 dígitos');
    }

    const tiposValidos: ConviteTipo[] = ['Convite', 'Solicitacao'];
    if (!tiposValidos.includes(this.#conviteTipo)) {
      throw new Error(`ConviteTipo inválido: ${this.#conviteTipo}`);
    }

    const statusValidos: ConviteStatus[] = ['Pendente', 'Aceito', 'Recusado'];
    if (!statusValidos.includes(this.#conviteStatus)) {
      throw new Error(`ConviteStatus inválido: ${this.#conviteStatus}`);
    }
  }

  toJSON(): ConviteGrupoProjeto {
    return {
      ConviteGUID: this.#conviteGUID,
      GrupoProjetoGUID: this.#grupoProjetoGUID,
      UsuarioCPFConvidado: this.#usuarioCPFConvidado,
      ConviteTipo: this.#conviteTipo,
      ConviteStatus: this.#conviteStatus,
      CreatedAt: this.#createdAt,
      UpdatedAt: this.#updatedAt
    };
  }
}
