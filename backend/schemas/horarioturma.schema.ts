import { z } from "zod";
import { isHoraValida } from "../utils/gradeHoraria.util";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DIAS_SEMANA_ENUM = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"] as const;

const MENSAGENS_TOPO: Record<string, string> = {
  turmaGUID: "Turma inválida",
  horarioTurmaGUID: "Horário inválido",
  slot: "Dados inválidos",
  MatProfTurGUID: "Alocação inválida",
  DiaSemana: "Dia da semana inválido",
  HoraInicio: "Horário inválido",
  HoraFim: "Horário inválido",
};

export function mensagemTopoHorarioTurma(campo: string | undefined): string {
  return (campo && MENSAGENS_TOPO[campo]) || "Erro na validação de dados";
}

export const HorarioTurmaTurmaGUIDParamSchema = z.object({
  turmaGUID: z
    .string({ message: "O parâmetro turmaGUID deve ser um UUID válido" })
    .regex(GUID_REGEX, "O parâmetro turmaGUID deve ser um UUID válido"),
});

export const HorarioTurmaHorarioGUIDParamSchema = z.object({
  horarioTurmaGUID: z
    .string({ message: "O parâmetro horarioTurmaGUID deve ser um UUID válido" })
    .regex(GUID_REGEX, "O parâmetro horarioTurmaGUID deve ser um UUID válido"),
});

const horaCampo = () =>
  z
    .string({ message: "HoraInicio e HoraFim são obrigatórios e devem estar no formato HH:MM" })
    .refine(isHoraValida, "HoraInicio e HoraFim são obrigatórios e devem estar no formato HH:MM");

export const CriarSlotBodySchema = z
  .object({
    slot: z.object(
      {
        MatProfTurGUID: z
          .string({ message: "MatProfTurGUID é obrigatório e deve ser um UUID válido" })
          .regex(GUID_REGEX, "MatProfTurGUID é obrigatório e deve ser um UUID válido"),
        DiaSemana: z.enum(DIAS_SEMANA_ENUM, {
          message: `DiaSemana é obrigatório e deve ser um dos: ${DIAS_SEMANA_ENUM.join(", ")}`,
        }),
        HoraInicio: horaCampo(),
        HoraFim: horaCampo(),
      },
      { message: "O campo 'slot' é obrigatório" }
    ),
  })
  .superRefine((data, ctx) => {
    if (data.slot.HoraInicio >= data.slot.HoraFim) {
      ctx.addIssue({ code: "custom", path: ["slot", "HoraInicio"], message: "HoraInicio deve ser anterior a HoraFim" });
    }
  });
