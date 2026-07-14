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

  while (cursor + minutosPorAula <= fimMin) {
    if (inicioIntervalos.has(cursor)) {
      cursor = fimPorInicio.get(cursor)!;
      continue;
    }

    slots.push({
      HoraInicio: minutosParaHora(cursor),
      HoraFim: minutosParaHora(cursor + minutosPorAula),
    });
    cursor += minutosPorAula;
  }

  return slots;
}

/**
 * Verifica se o início de um intervalo cai exatamente na borda de uma aula
 * (múltiplo inteiro de MinutosPorAula a partir do início do período). Se não
 * cair, retorna um aviso não-bloqueante descrevendo quantas aulas cabem antes
 * do intervalo (arredondado para a meia-aula mais próxima).
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

  const aulasArredondadas = Math.round(aulasAntes * 2) / 2;
  return {
    intervalo: intervaloInicio,
    mensagem: `O intervalo das ${intervaloInicio} corta uma aula: cabem ${aulasArredondadas} aula(s) de ${minutosPorAula}min a partir das ${periodoInicio}, antes deste intervalo.`,
  };
}
