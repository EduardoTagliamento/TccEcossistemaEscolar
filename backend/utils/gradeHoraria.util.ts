/**
 * Utilitários compartilhados de grade horária.
 *
 * Objetivo:
 * - Conversão de horários (string "HH:MM" <-> minutos desde 00:00).
 * - Cálculo de avisos não-bloqueantes quando um intervalo fixo corta uma aula
 *   de forma incomum (ex: sobram 2,5 aulas antes do intervalo).
 *
 * Usado por EscolaConfiguracaoService e, futuramente, pela montagem do
 * cronograma da turma (grade horária).
 */

export type DiaSemana =
  | "Segunda"
  | "Terca"
  | "Quarta"
  | "Quinta"
  | "Sexta"
  | "Sabado"
  | "Domingo";

export const DIAS_SEMANA: DiaSemana[] = [
  "Segunda",
  "Terca",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sabado",
  "Domingo",
];

const HORA_REGEX = /^([0-1]?\d|2[0-3]):([0-5]\d)$/;

export function isHoraValida(hora: string): boolean {
  return typeof hora === "string" && HORA_REGEX.test(hora.trim());
}

export function horaParaMinutos(hora: string): number {
  const match = HORA_REGEX.exec(hora.trim());
  if (!match) {
    throw new Error(`Horário inválido: "${hora}". Use o formato HH:MM.`);
  }
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

export function minutosParaHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface AvisoIntervalo {
  intervalo: string;
  mensagem: string;
}

export interface SlotAula {
  HoraInicio: string;
  HoraFim: string;
}

export interface IntervaloSimples {
  IntervaloInicio: string;
  IntervaloFim: string;
}

/**
 * Divide um período (ex: manhã ou tarde) em slots de aula consecutivos de
 * MinutosPorAula, pulando os intervalos que começam exatamente na borda de
 * um slot (caso comum/recomendado). Um intervalo que corta um slot no meio
 * (config incomum, já avisada no momento do salvamento da configuração) é
 * ignorado aqui — o slot é gerado normalmente por cima dele.
 *
 * Se o tempo restante no fim do período (ou entre um intervalo e o fim do
 * período) for menor que MinutosPorAula, ainda assim gera um último slot
 * "curto" com o que sobrar, em vez de descartar esse tempo — ex: período
 * até 12:20, última aula cheia terminando 11:40, gera um slot 11:40–12:20.
 */
export function calcularSlotsPeriodo(
  periodoInicio: string,
  periodoFim: string,
  minutosPorAula: number,
  intervalos: IntervaloSimples[] = []
): SlotAula[] {
  if (minutosPorAula <= 0) {
    return [];
  }

  const fimMin = horaParaMinutos(periodoFim);
  const inicioIntervalos = new Set(intervalos.map((i) => horaParaMinutos(i.IntervaloInicio)));
  const fimPorInicio = new Map(
    intervalos.map((i) => [horaParaMinutos(i.IntervaloInicio), horaParaMinutos(i.IntervaloFim)])
  );

  const slots: SlotAula[] = [];
  let cursor = horaParaMinutos(periodoInicio);

  while (cursor < fimMin) {
    if (inicioIntervalos.has(cursor)) {
      cursor = fimPorInicio.get(cursor)!;
      continue;
    }

    const fimSlot = Math.min(cursor + minutosPorAula, fimMin);
    slots.push({
      HoraInicio: minutosParaHora(cursor),
      HoraFim: minutosParaHora(fimSlot),
    });
    cursor = fimSlot;
  }

  return slots;
}

/**
 * Verifica se o início de um intervalo cai exatamente na borda de uma aula
 * (múltiplo inteiro de MinutosPorAula a partir do início do período). Se não
 * cair, o intervalo começa NO MEIO de uma aula específica — o aviso aponta
 * qual aula é essa, quanto tempo dela sobra antes do intervalo, e os dois
 * horários de início que resolveriam o desalinhamento.
 */
export function calcularAvisoIntervalo(
  periodoInicio: string,
  minutosPorAula: number,
  intervaloInicio: string
): AvisoIntervalo | null {
  if (minutosPorAula <= 0) {
    return null;
  }

  const inicioPeriodoMin = horaParaMinutos(periodoInicio);
  const inicioIntervaloMin = horaParaMinutos(intervaloInicio);
  const diffMin = inicioIntervaloMin - inicioPeriodoMin;

  if (diffMin < 0) {
    return null;
  }

  const aulasAntes = diffMin / minutosPorAula;
  if (Number.isInteger(aulasAntes)) {
    return null;
  }

  const numeroAula = Math.floor(aulasAntes) + 1;
  const inicioAulaMin = inicioPeriodoMin + Math.floor(aulasAntes) * minutosPorAula;
  const fimAulaMin = inicioAulaMin + minutosPorAula;
  const minutosAntesDoIntervalo = inicioIntervaloMin - inicioAulaMin;
  const minutosCortados = fimAulaMin - inicioIntervaloMin;

  const inicioAula = minutosParaHora(inicioAulaMin);
  const fimAula = minutosParaHora(fimAulaMin);

  return {
    intervalo: intervaloInicio,
    mensagem:
      `O intervalo das ${intervaloInicio} cai no meio da ${numeroAula}ª aula (${inicioAula}–${fimAula}): ` +
      `ela ficaria com só ${minutosAntesDoIntervalo} dos ${minutosPorAula} minutos antes do intervalo ` +
      `(os outros ${minutosCortados} min seriam cortados). ` +
      `Para não cortar a aula, ajuste o início do intervalo para ${inicioAula} (antes dela) ou ${fimAula} (depois dela).`,
  };
}
