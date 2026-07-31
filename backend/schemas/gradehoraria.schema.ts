import { z } from "zod";

// Regex estrita (UUID v4), igual ao middleware original de gradehoraria/horarioturma.
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATA_SIMPLES_REGEX = /^\d{4}-\d{2}-\d{2}/;

// Mesmos valores de backend/utils/gradeHoraria.util.ts::DIAS_SEMANA, redeclarados
// como tupla literal pra uso em z.enum (o util exporta DiaSemana[], mutável,
// incompatível com a tupla `[string, ...string[]]` que z.enum espera).
const DIAS_SEMANA_ENUM = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado", "Domingo"] as const;
const DIAS_SEMANA_MSG = `DiaSemana deve ser um dos: ${DIAS_SEMANA_ENUM.join(", ")}`;

const MENSAGENS_TOPO: Record<string, string> = {
  MateriaGUID: "MateriaGUID inválido",
  Escolhas: "Escolhas inválido",
  TurmaGUID: "TurmaGUID inválido",
  SemanaBase: "SemanaBase inválida",
  DiaSemana: "DiaSemana inválido",
  DeslocamentoMinutos: "DeslocamentoMinutos inválido",
};

export function mensagemTopoGradeHoraria(campo: string | undefined): string {
  return (campo && MENSAGENS_TOPO[campo]) || "Erro na validação de dados";
}

const EscolhaSchema = z.object({
  TurmaGUID: z.string({ message: "Cada escolha deve ter um TurmaGUID válido" }).regex(GUID_REGEX, "Cada escolha deve ter um TurmaGUID válido"),
  SemanaBase: z
    .string({ message: "Cada escolha deve ter SemanaBase no formato YYYY-MM-DD" })
    .regex(DATA_SIMPLES_REGEX, "Cada escolha deve ter SemanaBase no formato YYYY-MM-DD"),
  DiaSemana: z.enum(DIAS_SEMANA_ENUM, { message: DIAS_SEMANA_MSG }).optional(),
  DeslocamentoMinutos: z.number({ message: "DeslocamentoMinutos deve ser um número (pode ser negativo)" }).optional(),
});

export const GradeHorariaCalcularDatasBodySchema = z.object({
  MateriaGUID: z
    .string({ message: "MateriaGUID é obrigatório e deve ser um UUID válido" })
    .regex(GUID_REGEX, "MateriaGUID é obrigatório e deve ser um UUID válido"),
  Escolhas: z
    .array(EscolhaSchema, { message: "Escolhas é obrigatório e deve ser um array não vazio" })
    .min(1, "Escolhas é obrigatório e deve ser um array não vazio"),
});
