/**
 * Entidade HorarioTurma
 *
 * Representa um slot preenchido no cronograma (grade horária) de uma turma:
 * uma matéria+professor (MatProfTurGUID) ocupando um dia da semana e um
 * horário específico.
 *
 * Regras de negócio:
 * - Não existe linha "vazia": um slot sem matéria simplesmente não tem
 *   registro aqui (volta para o "banco" de matérias pendentes).
 * - Unicidade por (TurmaGUID, DiaSemana, HoraInicio).
 * - Antes de criar/mover, o professor da alocação não pode estar ocupado
 *   com outra turma no mesmo dia/horário (checado no service).
 */
import { DiaSemana, DIAS_SEMANA, isHoraValida } from "../utils/gradeHoraria.util";

export default class HorarioTurma {
  #HorarioTurmaGUID!: string;
  #TurmaGUID!: string;
  #MatProfTurGUID!: string;
  #DiaSemana!: DiaSemana;
  #HoraInicio!: string;
  #HoraFim!: string;
  #CreatedAt: Date | null = null;
  #UpdatedAt: Date | null = null;

  get HorarioTurmaGUID(): string {
    return this.#HorarioTurmaGUID;
  }

  set HorarioTurmaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("HorarioTurmaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#HorarioTurmaGUID = value.trim();
  }

  get TurmaGUID(): string {
    return this.#TurmaGUID;
  }

  set TurmaGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("TurmaGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#TurmaGUID = value.trim();
  }

  get MatProfTurGUID(): string {
    return this.#MatProfTurGUID;
  }

  set MatProfTurGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("MatProfTurGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#MatProfTurGUID = value.trim();
  }

  get DiaSemana(): DiaSemana {
    return this.#DiaSemana;
  }

  set DiaSemana(value: DiaSemana) {
    if (!DIAS_SEMANA.includes(value)) {
      throw new Error(`DiaSemana inválido: "${value}".`);
    }
    this.#DiaSemana = value;
  }

  get HoraInicio(): string {
    return this.#HoraInicio;
  }

  set HoraInicio(value: string) {
    if (!isHoraValida(value)) {
      throw new Error("HoraInicio deve estar no formato HH:MM.");
    }
    this.#HoraInicio = value.trim();
  }

  get HoraFim(): string {
    return this.#HoraFim;
  }

  set HoraFim(value: string) {
    if (!isHoraValida(value)) {
      throw new Error("HoraFim deve estar no formato HH:MM.");
    }
    this.#HoraFim = value.trim();
  }

  get CreatedAt(): Date | null {
    return this.#CreatedAt;
  }

  set CreatedAt(value: Date | null) {
    this.#CreatedAt = value;
  }

  get UpdatedAt(): Date | null {
    return this.#UpdatedAt;
  }

  set UpdatedAt(value: Date | null) {
    this.#UpdatedAt = value;
  }

  validar(): void {
    if (!this.#TurmaGUID) throw new Error("TurmaGUID é obrigatório");
    if (!this.#MatProfTurGUID) throw new Error("MatProfTurGUID é obrigatório");
    if (!this.#DiaSemana) throw new Error("DiaSemana é obrigatório");
    if (!this.#HoraInicio || !this.#HoraFim) {
      throw new Error("HoraInicio e HoraFim são obrigatórios");
    }
    if (this.#HoraInicio >= this.#HoraFim) {
      throw new Error("HoraInicio deve ser anterior a HoraFim");
    }
  }
}
