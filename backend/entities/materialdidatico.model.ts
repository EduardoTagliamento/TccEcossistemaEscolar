/**
 * Livro didático cadastrado uma vez, em nível de Escola (spec item 7-9) —
 * não trava matéria: cada capítulo (`MaterialDidaticoCapitulo`) tem sua
 * própria `MateriaGUID`, cobrindo tanto livro de matéria única quanto
 * livro geral (ex.: "Ciências" com seções de Física/Química/Biologia).
 */
export default class MaterialDidatico {
  #MaterialDidaticoGUID!: string;
  #EscolaGUID!: string;
  #Titulo!: string;
  // Nome de coluna real em produção é `CriadoPorGUID`, mas o valor é um CPF —
  // `materialdidatico` foi deixada de fora da migração CPF->GUID do projeto
  // (ver docs/concluidas/PROGRESSO_MIGRACAO_USUARIO_GUID.md); o nome da coluna
  // ficou errado desde a criação da tabela e só foi descoberto agora porque
  // essa rota nunca tinha sido exercitada de verdade em produção.
  #CriadoPorGUID!: string;
  #CreatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  MaterialDidatico.constructor()");
  }

  get MaterialDidaticoGUID(): string {
    return this.#MaterialDidaticoGUID;
  }

  set MaterialDidaticoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MaterialDidaticoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MaterialDidaticoGUID = value.trim();
  }

  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  set EscolaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("EscolaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#EscolaGUID = value.trim();
  }

  get Titulo(): string {
    return this.#Titulo;
  }

  set Titulo(value: string) {
    if (typeof value !== "string" || value.trim().length < 2) {
      throw new Error("Titulo deve ter pelo menos 2 caracteres.");
    }
    if (value.trim().length > 255) {
      throw new Error("Titulo deve ter no máximo 255 caracteres.");
    }
    this.#Titulo = value.trim();
  }

  get CriadoPorGUID(): string {
    return this.#CriadoPorGUID;
  }

  set CriadoPorGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("CriadoPorGUID deve ser uma string não vazia.");
    }
    this.#CriadoPorGUID = value.trim();
  }

  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    this.#CreatedAt = value ?? null;
  }

  // Campos são privados (#field) com getters — sem isso, JSON.stringify(res.json())
  // devolve {} pra essa classe, porque campos privados e getters de protótipo não
  // são enumeráveis. Só foi descoberto agora porque essa rota nunca tinha sido
  // exercitada de verdade em produção.
  toJSON() {
    return {
      MaterialDidaticoGUID: this.MaterialDidaticoGUID,
      EscolaGUID: this.EscolaGUID,
      Titulo: this.Titulo,
      CriadoPorGUID: this.CriadoPorGUID,
      CreatedAt: this.CreatedAt,
    };
  }
}
