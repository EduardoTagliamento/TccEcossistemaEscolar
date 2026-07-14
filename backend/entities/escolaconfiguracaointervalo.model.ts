/**
 * Entidade EscolaConfiguracaoIntervalo (tabela filha de EscolaConfiguracao)
 *
 * Representa um intervalo (recreio) fixo da escola.
 * - Se a configuração tem IntervaloVariado=false: DiaSemana fica null e o
 *   intervalo se repete em todos os dias letivos.
 * - Se IntervaloVariado=true: cada linha tem um DiaSemana específico.
 */
import { DiaSemana, DIAS_SEMANA, isHoraValida } from "../utils/gradeHoraria.util";

export default class EscolaConfiguracaoIntervalo {
  #EscolaConfiguracaoIntervaloGUID!: string;
  #EscolaConfiguracaoGUID!: string;
  #DiaSemana: DiaSemana | null = null;
  #IntervaloInicio!: string;
  #IntervaloFim!: string;

  get EscolaConfiguracaoIntervaloGUID(): string {
    return this.#EscolaConfiguracaoIntervaloGUID;
  }

  set EscolaConfiguracaoIntervaloGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("EscolaConfiguracaoIntervaloGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#EscolaConfiguracaoIntervaloGUID = value.trim();
  }

  get EscolaConfiguracaoGUID(): string {
    return this.#EscolaConfiguracaoGUID;
  }

  set EscolaConfiguracaoGUID(value: string) {
    if (typeof value !== "string" || value.trim().length !== 36) {
      throw new Error("EscolaConfiguracaoGUID deve ser um UUID válido (36 caracteres).");
    }
    this.#EscolaConfiguracaoGUID = value.trim();
  }

  get DiaSemana(): DiaSemana | null {
    return this.#DiaSemana;
  }

  set DiaSemana(value: DiaSemana | null) {
    if (value === null || value === undefined) {
      this.#DiaSemana = null;
      return;
    }
    if (!DIAS_SEMANA.includes(value)) {
      throw new Error(`DiaSemana inválido: "${value}".`);
    }
    this.#DiaSemana = value;
  }

  get IntervaloInicio(): string {
    return this.#IntervaloInicio;
  }

  set IntervaloInicio(value: string) {
    if (!isHoraValida(value)) {
      throw new Error("IntervaloInicio deve estar no formato HH:MM.");
    }
    this.#IntervaloInicio = value.trim();
  }

  get IntervaloFim(): string {
    return this.#IntervaloFim;
  }

  set IntervaloFim(value: string) {
    if (!isHoraValida(value)) {
      throw new Error("IntervaloFim deve estar no formato HH:MM.");
    }
    this.#IntervaloFim = value.trim();
  }

  validar(): void {
    if (!this.#EscolaConfiguracaoGUID) {
      throw new Error("EscolaConfiguracaoGUID é obrigatório.");
    }
    if (!this.#IntervaloInicio || !this.#IntervaloFim) {
      throw new Error("IntervaloInicio e IntervaloFim são obrigatórios.");
    }
    if (this.#IntervaloInicio >= this.#IntervaloFim) {
      throw new Error("IntervaloInicio deve ser anterior a IntervaloFim.");
    }
  }
}
