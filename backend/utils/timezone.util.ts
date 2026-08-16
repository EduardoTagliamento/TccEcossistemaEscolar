/**
 * Datas cruas vindas do frontend (via `converterParaBrasil`, ver
 * frontend/lib/timezone-utils.ts) chegam como string SEM timezone, ex.
 * "2026-08-20T07:00:00" — o valor já está em GMT-3, não no timezone do
 * processo Node. `new Date(stringSemOffset)` interpreta a string usando o
 * timezone LOCAL do servidor (UTC no Railway), deslocando a hora em até 3h
 * (bug real: prova salva às 07:00 exibida como 04:00). Esta função replica a
 * mesma regra de detecção usada no frontend: só acrescenta "-03:00" quando a
 * string não já tem um offset/Z explícito.
 */
export function parseDataBrasil(data: string | Date): Date {
  if (data instanceof Date) return data;
  const temOffsetExplicito = data.includes('Z') || data.includes('+') || data.indexOf('-', 10) !== -1;
  return temOffsetExplicito ? new Date(data) : new Date(`${data}-03:00`);
}
