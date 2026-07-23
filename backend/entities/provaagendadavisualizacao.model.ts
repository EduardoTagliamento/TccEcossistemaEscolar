/**
 * Marca que um aluno (matrícula) já abriu/visualizou uma ProvaAgendada numa
 * turma específica — igual ao progresso de Conteudo tipo "texto": 100%
 * instantâneo ao abrir, sem nenhuma relação com nota (fora de escopo).
 */
export default class ProvaAgendadaVisualizacao {
  #ProvaAgendadaVisualizacaoGUID!: string;
  #ProvaAgendadaTurmaGUID!: string;
  #MatriculaGUID!: string;
  #VisualizadoEm: Date | null = null;

  constructor() {
    console.log("⬆️  ProvaAgendadaVisualizacao.constructor()");
  }

  get ProvaAgendadaVisualizacaoGUID(): string {
    return this.#ProvaAgendadaVisualizacaoGUID;
  }

  set ProvaAgendadaVisualizacaoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ProvaAgendadaVisualizacaoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ProvaAgendadaVisualizacaoGUID = value.trim();
  }

  get ProvaAgendadaTurmaGUID(): string {
    return this.#ProvaAgendadaTurmaGUID;
  }

  set ProvaAgendadaTurmaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("ProvaAgendadaTurmaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#ProvaAgendadaTurmaGUID = value.trim();
  }

  get MatriculaGUID(): string {
    return this.#MatriculaGUID;
  }

  set MatriculaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "" || value.trim().length > 36) {
      throw new Error("MatriculaGUID deve ser uma string não vazia de até 36 caracteres.");
    }
    this.#MatriculaGUID = value.trim();
  }

  get VisualizadoEm(): Date | null {
    return this.#VisualizadoEm;
  }

  set VisualizadoEm(value: Date | null) {
    this.#VisualizadoEm = value ?? null;
  }
}
