import { z } from "zod";
import { DIAS_SEMANA, isHoraValida } from "../utils/gradeHoraria.util";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MENSAGENS_TOPO: Record<string, string> = {
  configuracao: "Dados inválidos",
  MinutosPorAula: "MinutosPorAula inválido",
  DiasSemana: "DiasSemana inválido",
  PeriodoManha: "Período da manhã inválido",
  TemAulaTarde: "TemAulaTarde inválido",
  PeriodoTarde: "Período da tarde inválido",
  IntervaloVariado: "IntervaloVariado inválido",
  Intervalos: "Intervalos inválido",
  Intervalo: "Intervalo inválido",
  escolaGUID: "EscolaGUID inválido",
};

export function mensagemTopoEscolaConfiguracao(campo: string | undefined): string {
  return (campo && MENSAGENS_TOPO[campo]) || "Erro na validação de dados";
}

/**
 * Réplica fiel de `EscolaConfiguracaoMiddleware.validarAtualizacao` original
 * (imperativo, com dependências cruzadas entre campos: `PeriodoTardeInicio/
 * Fim` só são obrigatórios quando `TemAulaTarde=true`; cada item de
 * `Intervalos` só exige `DiaSemana` quando `IntervaloVariado=true`) — feito
 * via um único `superRefine` sobre o objeto inteiro, com `path` sintético
 * por checagem pra bater com a mensagem de topo certa via
 * `mensagemTopoEscolaConfiguracao` (último segmento do path).
 */
export const AtualizarConfiguracaoBodySchema = z.object({
  configuracao: z.unknown().superRefine((configuracao, ctx) => {
    if (!configuracao || typeof configuracao !== "object") {
      ctx.addIssue({ code: "custom", path: ["configuracao"], message: "O campo 'configuracao' é obrigatório" });
      return;
    }

    const c = configuracao as Record<string, unknown>;
    const { MinutosPorAula, DiasSemana, PeriodoManhaInicio, PeriodoManhaFim, TemAulaTarde, PeriodoTardeInicio, PeriodoTardeFim, IntervaloVariado, Intervalos } = c;

    if (typeof MinutosPorAula !== "number" || !Number.isInteger(MinutosPorAula)) {
      ctx.addIssue({ code: "custom", path: ["MinutosPorAula"], message: "MinutosPorAula é obrigatório e deve ser um número inteiro" });
      return;
    }

    if (!Array.isArray(DiasSemana) || DiasSemana.length === 0) {
      ctx.addIssue({ code: "custom", path: ["DiasSemana"], message: "DiasSemana é obrigatório e deve conter ao menos um dia" });
      return;
    }
    const diaInvalido = DiasSemana.find((dia: unknown) => !DIAS_SEMANA.includes(dia as any));
    if (diaInvalido !== undefined) {
      ctx.addIssue({ code: "custom", path: ["DiasSemana"], message: `Dia da semana inválido: "${diaInvalido}"` });
      return;
    }

    if (!isHoraValida(PeriodoManhaInicio as string) || !isHoraValida(PeriodoManhaFim as string)) {
      ctx.addIssue({ code: "custom", path: ["PeriodoManha"], message: "PeriodoManhaInicio e PeriodoManhaFim são obrigatórios e devem estar no formato HH:MM" });
      return;
    }

    if (typeof TemAulaTarde !== "boolean") {
      ctx.addIssue({ code: "custom", path: ["TemAulaTarde"], message: "TemAulaTarde é obrigatório e deve ser um booleano" });
      return;
    }

    if (TemAulaTarde && (!isHoraValida(PeriodoTardeInicio as string) || !isHoraValida(PeriodoTardeFim as string))) {
      ctx.addIssue({ code: "custom", path: ["PeriodoTarde"], message: "Quando TemAulaTarde=true, PeriodoTardeInicio e PeriodoTardeFim são obrigatórios (HH:MM)" });
      return;
    }

    if (typeof IntervaloVariado !== "boolean") {
      ctx.addIssue({ code: "custom", path: ["IntervaloVariado"], message: "IntervaloVariado é obrigatório e deve ser um booleano" });
      return;
    }

    if (!Array.isArray(Intervalos)) {
      ctx.addIssue({ code: "custom", path: ["Intervalos"], message: "Intervalos deve ser um array (pode ser vazio)" });
      return;
    }

    for (const intervalo of Intervalos as any[]) {
      if (!isHoraValida(intervalo?.IntervaloInicio) || !isHoraValida(intervalo?.IntervaloFim)) {
        ctx.addIssue({ code: "custom", path: ["Intervalo"], message: "Cada intervalo deve ter IntervaloInicio e IntervaloFim no formato HH:MM" });
        return;
      }
      if (IntervaloVariado && (!intervalo.DiaSemana || !DIAS_SEMANA.includes(intervalo.DiaSemana))) {
        ctx.addIssue({ code: "custom", path: ["Intervalo"], message: "Com IntervaloVariado=true, cada intervalo deve informar um DiaSemana válido" });
        return;
      }
    }
  }),
});

export const EscolaConfiguracaoGUIDParamSchema = z.object({
  escolaGUID: z
    .string({ message: "O parâmetro escolaGUID deve ser um UUID válido" })
    .regex(GUID_REGEX, "O parâmetro escolaGUID deve ser um UUID válido"),
});
