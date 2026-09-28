/**
 * Entidade RepresentanteLancamentoPropagacao
 *
 * Representa o estado de fan-out de UMA turma-irmã quando um Representante/
 * Vice-Representante cria Prova, Tarefa ou Conteúdo "em nome" do professor
 * (ver docs/PLANO_IMPLEMENTACAO_LANCAMENTO_POR_REPRESENTANTE.md). Uma linha
 * por (entidade de origem × turma destino) — nunca há timeout: fica
 * `Pendente` até o representante da turma destino responder pelo WhatsApp,
 * ou pra sempre, se ele nunca responder.
 */
export default class RepresentanteLancamentoPropagacao {
  #PropagacaoGUID!: string;
  #TipoOrigem!: 'Prova' | 'Tarefa' | 'Conteudo';
  #OrigemGUID!: string;
  #TurmaOrigemGUID!: string;
  #TurmaDestinoGUID!: string;
  #RepresentanteDestinoUsuarioGUID!: string | null;
  #Status!: 'Pendente' | 'Confirmado' | 'RecusadoComEdicao';
  #ConteudoEditado!: string | null;
  #EntidadeResultanteGUID!: string | null;
  #CreatedAt!: Date;
  #RespondidoEm!: Date | null;

  // ==================== GETTERS ====================

  get PropagacaoGUID(): string {
    return this.#PropagacaoGUID;
  }

  get TipoOrigem(): 'Prova' | 'Tarefa' | 'Conteudo' {
    return this.#TipoOrigem;
  }

  get OrigemGUID(): string {
    return this.#OrigemGUID;
  }

  get TurmaOrigemGUID(): string {
    return this.#TurmaOrigemGUID;
  }

  get TurmaDestinoGUID(): string {
    return this.#TurmaDestinoGUID;
  }

  get RepresentanteDestinoUsuarioGUID(): string | null {
    return this.#RepresentanteDestinoUsuarioGUID;
  }

  get Status(): 'Pendente' | 'Confirmado' | 'RecusadoComEdicao' {
    return this.#Status;
  }

  get ConteudoEditado(): string | null {
    return this.#ConteudoEditado;
  }

  get EntidadeResultanteGUID(): string | null {
    return this.#EntidadeResultanteGUID;
  }

  get CreatedAt(): Date {
    return this.#CreatedAt;
  }

  get RespondidoEm(): Date | null {
    return this.#RespondidoEm;
  }

  // ==================== SETTERS ====================

  set PropagacaoGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('PropagacaoGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#PropagacaoGUID = value.trim();
  }

  set TipoOrigem(value: 'Prova' | 'Tarefa' | 'Conteudo') {
    if (value !== 'Prova' && value !== 'Tarefa' && value !== 'Conteudo') {
      throw new Error('TipoOrigem deve ser "Prova", "Tarefa" ou "Conteudo"');
    }
    this.#TipoOrigem = value;
  }

  set OrigemGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('OrigemGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#OrigemGUID = value.trim();
  }

  set TurmaOrigemGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('TurmaOrigemGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#TurmaOrigemGUID = value.trim();
  }

  set TurmaDestinoGUID(value: string) {
    if (typeof value !== 'string' || value.trim().length !== 36) {
      throw new Error('TurmaDestinoGUID deve ser um UUID válido (36 caracteres)');
    }
    this.#TurmaDestinoGUID = value.trim();
  }

  set RepresentanteDestinoUsuarioGUID(value: string | null) {
    this.#RepresentanteDestinoUsuarioGUID = value ? value.trim() : null;
  }

  set Status(value: 'Pendente' | 'Confirmado' | 'RecusadoComEdicao') {
    if (value !== 'Pendente' && value !== 'Confirmado' && value !== 'RecusadoComEdicao') {
      throw new Error('Status deve ser "Pendente", "Confirmado" ou "RecusadoComEdicao"');
    }
    this.#Status = value;
  }

  set ConteudoEditado(value: string | null) {
    this.#ConteudoEditado = value ?? null;
  }

  set EntidadeResultanteGUID(value: string | null) {
    this.#EntidadeResultanteGUID = value ?? null;
  }

  set CreatedAt(value: Date) {
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error('CreatedAt deve ser uma data válida');
    }
    this.#CreatedAt = value;
  }

  set RespondidoEm(value: Date | null) {
    if (value !== null && (!(value instanceof Date) || isNaN(value.getTime()))) {
      throw new Error('RespondidoEm deve ser uma data válida ou null');
    }
    this.#RespondidoEm = value;
  }

  // ==================== MÉTODOS ====================

  validar(): void {
    if (!this.#PropagacaoGUID) throw new Error('PropagacaoGUID é obrigatório');
    if (!this.#TipoOrigem) throw new Error('TipoOrigem é obrigatório');
    if (!this.#OrigemGUID) throw new Error('OrigemGUID é obrigatório');
    if (!this.#TurmaOrigemGUID) throw new Error('TurmaOrigemGUID é obrigatório');
    if (!this.#TurmaDestinoGUID) throw new Error('TurmaDestinoGUID é obrigatório');
    if (!this.#Status) throw new Error('Status é obrigatório');
    if (!this.#CreatedAt) throw new Error('CreatedAt é obrigatório');
  }

  toJSON() {
    return {
      PropagacaoGUID: this.#PropagacaoGUID,
      TipoOrigem: this.#TipoOrigem,
      OrigemGUID: this.#OrigemGUID,
      TurmaOrigemGUID: this.#TurmaOrigemGUID,
      TurmaDestinoGUID: this.#TurmaDestinoGUID,
      RepresentanteDestinoUsuarioGUID: this.#RepresentanteDestinoUsuarioGUID,
      Status: this.#Status,
      ConteudoEditado: this.#ConteudoEditado,
      EntidadeResultanteGUID: this.#EntidadeResultanteGUID,
      CreatedAt: this.#CreatedAt,
      RespondidoEm: this.#RespondidoEm,
    };
  }

  static fromDatabase(data: any): RepresentanteLancamentoPropagacao {
    const p = new RepresentanteLancamentoPropagacao();
    p.PropagacaoGUID = data.PropagacaoGUID;
    p.TipoOrigem = data.TipoOrigem;
    p.OrigemGUID = data.OrigemGUID;
    p.TurmaOrigemGUID = data.TurmaOrigemGUID;
    p.TurmaDestinoGUID = data.TurmaDestinoGUID;
    p.RepresentanteDestinoUsuarioGUID = data.RepresentanteDestinoUsuarioGUID ?? null;
    p.Status = data.Status;
    p.ConteudoEditado = data.ConteudoEditado ?? null;
    p.EntidadeResultanteGUID = data.EntidadeResultanteGUID ?? null;
    p.CreatedAt = data.CreatedAt;
    p.RespondidoEm = data.RespondidoEm ?? null;
    return p;
  }
}
