export type HistoricoTipo = 
  | 'TransferenciaLider' 
  | 'Expulsao' 
  | 'Saida' 
  | 'Entrada' 
  | 'PendenciaDelegada'
  | 'TarefaConcluida';

export interface HistoricoGrupoTarefa {
  HistoricoGUID: string;
  GrupoTarefaGUID: string;
  HistoricoTipo: HistoricoTipo;
  UsuarioCPFAtor: string;
  UsuarioCPFAlvo: string | null;
  HistoricoDetalhes: string | null;  // JSON serializado
  CreatedAt: Date;
}

export interface HistoricoGrupoTarefaCreateDTO {
  GrupoTarefaGUID: string;
  HistoricoTipo: HistoricoTipo;
  UsuarioCPFAtor: string;
  UsuarioCPFAlvo?: string;
  HistoricoDetalhes?: Record<string, any>;
}

export class HistoricoGrupoTarefaEntity {
  #historicoGUID: string;
  #grupoTarefaGUID: string;
  #historicoTipo: HistoricoTipo;
  #usuarioCPFAtor: string;
  #usuarioCPFAlvo: string | null;
  #historicoDetalhes: string | null;
  #createdAt: Date;

  constructor(data: HistoricoGrupoTarefa) {
    this.#historicoGUID = data.HistoricoGUID;
    this.#grupoTarefaGUID = data.GrupoTarefaGUID;
    this.#historicoTipo = data.HistoricoTipo;
    this.#usuarioCPFAtor = data.UsuarioCPFAtor;
    this.#usuarioCPFAlvo = data.UsuarioCPFAlvo;
    this.#historicoDetalhes = data.HistoricoDetalhes;
    this.#createdAt = data.CreatedAt;
  }

  get historicoGUID(): string { return this.#historicoGUID; }
  get grupoTarefaGUID(): string { return this.#grupoTarefaGUID; }
  get historicoTipo(): HistoricoTipo { return this.#historicoTipo; }
  get usuarioCPFAtor(): string { return this.#usuarioCPFAtor; }
  get usuarioCPFAlvo(): string | null { return this.#usuarioCPFAlvo; }
  get historicoDetalhes(): string | null { return this.#historicoDetalhes; }
  get createdAt(): Date { return this.#createdAt; }

  validar(): void {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(this.#historicoGUID)) {
      throw new Error('HistoricoGUID inválido');
    }

    const tiposValidos: HistoricoTipo[] = [
      'TransferenciaLider',
      'Expulsao',
      'Saida',
      'Entrada',
      'PendenciaDelegada',
      'TarefaConcluida'
    ];
    
    if (!tiposValidos.includes(this.#historicoTipo)) {
      throw new Error(`HistoricoTipo inválido: ${this.#historicoTipo}`);
    }
  }

  toJSON(): HistoricoGrupoTarefa {
    return {
      HistoricoGUID: this.#historicoGUID,
      GrupoTarefaGUID: this.#grupoTarefaGUID,
      HistoricoTipo: this.#historicoTipo,
      UsuarioCPFAtor: this.#usuarioCPFAtor,
      UsuarioCPFAlvo: this.#usuarioCPFAlvo,
      HistoricoDetalhes: this.#historicoDetalhes,
      CreatedAt: this.#createdAt
    };
  }
}
