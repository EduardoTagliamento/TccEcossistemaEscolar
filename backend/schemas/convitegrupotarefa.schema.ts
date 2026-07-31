import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CPF_REGEX = /^[0-9]{11}$/;

const guid = (campo: string) => z.string().regex(GUID_REGEX, `O parâmetro '${campo}' deve ser um UUID válido.`);

export const ConviteGrupoGUIDParamSchema = z.object({
  grupoGUID: guid("grupoGUID"),
});

export const ConviteGUIDParamSchema = z.object({
  conviteGUID: guid("conviteGUID"),
});

export const EnviarConviteBodySchema = z.object({
  UsuarioCPFConvidado: z
    .string({ message: "O campo 'UsuarioCPFConvidado' é obrigatório e deve ser uma string." })
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => CPF_REGEX.test(v), "O campo 'UsuarioCPFConvidado' deve ter 11 dígitos numéricos."),
});
