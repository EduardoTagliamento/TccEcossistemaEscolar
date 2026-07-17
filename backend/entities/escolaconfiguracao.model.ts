/**
 * Representa a entidade Configuração da Escola.
 *
 * Objetivo:
 * - Encapsular os parâmetros de horário letivo de uma escola (minutos por
 *   aula, dias com aula, período da manhã e, opcionalmente, da tarde).
 * - Garantir integridade dos atributos via getters e setters.
 *
 * É a base para o cálculo da grade de aulas (usada no cronograma de turma) e
 * para o modelo de planilha de cronograma.
 */
import { DiaSemana, DIAS_SEMANA, isHoraValida } from "../utils/gradeHoraria.util";

export default class EscolaConfiguracao {
  #EscolaConfiguracaoGUID!: string;
  #EscolaGUID!: string;
  #MinutosPorAula: number = 50;
  #DiasSemana: DiaSemana[] = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"];
  #PeriodoManhaInicio: string | null = null;
  #PeriodoManhaFim: string | null = null;
  #TemAulaTarde: boolean = false;
  #PeriodoTardeInicio: string | null = null;
  #PeriodoTardeFim: string | null = null;
  #IntervaloVariado: boolean = false;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  constructor() {
    console.log("⬆️  EscolaConfiguracao.constructor()");
  }

  // ========== EscolaConfiguracaoGUID ==========
  get EscolaConfiguracaoGUID(): string {
    return this.#EscolaConfiguracaoGUID;
  }

  set EscolaConfiguracaoGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("EscolaConfiguracaoGUID deve ser uma string não vazia.");
    }

    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("EscolaConfiguracaoGUID deve ter 36 caracteres.");
    }

    this.#EscolaConfiguracaoGUID = guid;
  }

  // ========== EscolaGUID ==========
  get EscolaGUID(): string {
    return this.#EscolaGUID;
  }

  set EscolaGUID(value: string) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("EscolaGUID deve ser uma string não vazia.");
    }

    const guid = value.trim();
    if (guid.length !== 36) {
      throw new Error("EscolaGUID deve ter 36 caracteres.");
    }

    this.#EscolaGUID = guid;
  }

  // ========== MinutosPorAula ==========
  get MinutosPorAula(): number {
    return this.#MinutosPorAula;
  }

  set MinutosPorAula(value: number) {
    if (typeof value !== "number" || !Number.isInteger(value)) {
      throw new Error("MinutosPorAula deve ser um número inteiro.");
    }
    if (value < 10 || value > 180) {
      throw new Error("MinutosPorAula deve estar entre 10 e 180 minutos.");
    }
    this.#MinutosPorAula = value;
  }

  // ========== DiasSemana ==========
  get DiasSemana(): DiaSemana[] {
    return [...this.#DiasSemana];
  }

  set DiasSemana(value: DiaSemana[]) {
    if (!Array.isArray(value) || value.length === 0) {
      throw new Error("DiasSemana deve conter ao menos um dia da semana.");
    }

    const invalidos = value.filter((dia) => !DIAS_SEMANA.includes(dia));
    if (invalidos.length > 0) {
      throw new Error(`DiasSemana contém valores inválidos: ${invalidos.join(", ")}.`);
    }

    // Remove duplicatas mantendo a ordem canônica (Segunda -> Domingo)
    const unicos = new Set(value);
    this.#DiasSemana = DIAS_SEMANA.filter((dia) => unicos.has(dia));
  }

  // ========== PeriodoManhaInicio ==========
  get PeriodoManhaInicio(): string | null {
    return this.#PeriodoManhaInicio;
  }

  set PeriodoManhaInicio(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#PeriodoManhaInicio = null;
      return;
    }
    if (!isHoraValida(value)) {
      throw new Error("PeriodoManhaInicio deve estar no formato HH:MM.");
    }
    this.#PeriodoManhaInicio = value.trim();
  }

  // ========== PeriodoManhaFim ==========
  get PeriodoManhaFim(): string | null {
    return this.#PeriodoManhaFim;
  }

  set PeriodoManhaFim(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#PeriodoManhaFim = null;
      return;
    }
    if (!isHoraValida(value)) {
      throw new Error("PeriodoManhaFim deve estar no formato HH:MM.");
    }
    this.#PeriodoManhaFim = value.trim();
  }

  // ========== TemAulaTarde ==========
  get TemAulaTarde(): boolean {
    return this.#TemAulaTarde;
  }

  set TemAulaTarde(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("TemAulaTarde deve ser um booleano.");
    }
    this.#TemAulaTarde = value;
  }

  // ========== PeriodoTardeInicio ==========
  get PeriodoTardeInicio(): string | null {
    return this.#PeriodoTardeInicio;
  }

  set PeriodoTardeInicio(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#PeriodoTardeInicio = null;
      return;
    }
    if (!isHoraValida(value)) {
      throw new Error("PeriodoTardeInicio deve estar no formato HH:MM.");
    }
    this.#PeriodoTardeInicio = value.trim();
  }

  // ========== PeriodoTardeFim ==========
  get PeriodoTardeFim(): string | null {
    return this.#PeriodoTardeFim;
  }

  set PeriodoTardeFim(value: string | null) {
    if (value === null || value === undefined || value === "") {
      this.#PeriodoTardeFim = null;
      return;
    }
    if (!isHoraValida(value)) {
      throw new Error("PeriodoTardeFim deve estar no formato HH:MM.");
    }
    this.#PeriodoTardeFim = value.trim();
  }

  // ========== IntervaloVariado ==========
  get IntervaloVariado(): boolean {
    return this.#IntervaloVariado;
  }

  set IntervaloVariado(value: boolean) {
    if (typeof value !== "boolean") {
      throw new Error("IntervaloVariado deve ser um booleano.");
    }
    this.#IntervaloVariado = value;
  }

  // ========== CreatedAt ==========
  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#CreatedAt = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("CreatedAt deve ser uma data válida.");
    }
    this.#CreatedAt = value;
  }

  // ========== UpdatedAt ==========
  get UpdatedAt(): Date | null {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date | null) {
    if (value === null || value === undefined) {
      this.#UpdatedAt = null;
      return;
    }
    if (!(value instanceof Date) || isNaN(value.getTime())) {
      throw new Error("UpdatedAt deve ser uma data válida.");
    }
    this.#UpdatedAt = value;
  }

  /**
   * Validações que dependem de mais de um campo simultaneamente.
   * Chamado pelo service antes de persistir.
   */
  validarConsistencia(): void {
    if (!this.#PeriodoManhaInicio || !this.#PeriodoManhaFim) {
      throw new Error("Período da manhã (início e fim) é obrigatório.");
    }
    if (this.#PeriodoManhaInicio >= this.#PeriodoManhaFim) {
      throw new Error("PeriodoManhaInicio deve ser anterior a PeriodoManhaFim.");
    }

    if (this.#TemAulaTarde) {
      if (!this.#PeriodoTardeInicio || !this.#PeriodoTardeFim) {
        throw new Error("Período da tarde (início e fim) é obrigatório quando TemAulaTarde=true.");
      }
      if (this.#PeriodoTardeInicio >= this.#PeriodoTardeFim) {
        throw new Error("PeriodoTardeInicio deve ser anterior a PeriodoTardeFim.");
      }
      if (this.#PeriodoTardeInicio < this.#PeriodoManhaFim) {
        throw new Error("O período da tarde não pode começar antes do fim do período da manhã.");
      }
    }
  }
}
