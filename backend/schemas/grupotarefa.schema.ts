import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CPF_REGEX = /^[0-9]{11}$/;

const guid = (campo: string) => z.string().regex(GUID_REGEX, `O parâmetro '${campo}' deve ser um UUID válido.`);

// CPF chega já limpo em alguns lugares e com máscara em outros — a validação
// sempre remove não-dígitos antes de checar o formato, igual ao middleware original.
const cpfParam = (campo: string) =>
  z
    .string({ message: `O parâmetro '${campo}' é obrigatório!` })
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => CPF_REGEX.test(v), `O parâmetro '${campo}' deve ter 11 dígitos numéricos.`);

export const TarefaGUIDParamSchema = z.object({
  tarefaGUID: guid("tarefaGUID"),
});

export const GrupoGUIDParamSchema = z.object({
  grupoGUID: guid("grupoGUID"),
});

export const GrupoAndMembroParamsSchema = z.object({
  grupoGUID: guid("grupoGUID"),
  cpf: cpfParam("cpf"),
});

export const NomeGrupoBodySchema = z.object({
  GrupoNome: z
    .string({ message: "O campo 'GrupoNome' é obrigatório e deve ser uma string." })
    .trim()
    .min(1, "O campo 'GrupoNome' deve ter entre 1 e 128 caracteres.")
    .max(128, "O campo 'GrupoNome' deve ter entre 1 e 128 caracteres."),
});

export const TransferirLiderBodySchema = z.object({
  NovoLiderCPF: z
    .string({ message: "O campo 'NovoLiderCPF' é obrigatório e deve ser uma string." })
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => CPF_REGEX.test(v), "O campo 'NovoLiderCPF' deve ter 11 dígitos numéricos."),
});
