import { z } from "zod";
import { ESCOPOS_APIKEY_VALIDOS } from "../entities/apikey.model";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const ApiKeyGUIDParamSchema = z.object({
  ApiKeyGUID: z
    .string({ message: "ApiKeyGUID é obrigatório na URL" })
    .regex(GUID_REGEX, "ApiKeyGUID inválido (deve ser UUID v4)"),
});

export const CreateApiKeyBodySchema = z.object({
  EscolaGUID: z
    .string({ message: "EscolaGUID é obrigatório" })
    .min(1, "EscolaGUID é obrigatório")
    .regex(GUID_REGEX, "EscolaGUID inválido (deve ser UUID v4)"),
  ApiKeyNome: z
    .string({ message: "ApiKeyNome é obrigatório" })
    .trim()
    .min(3, "ApiKeyNome deve ter entre 3 e 100 caracteres")
    .max(100, "ApiKeyNome deve ter entre 3 e 100 caracteres"),
  ApiKeyEscopos: z
    .array(z.enum(ESCOPOS_APIKEY_VALIDOS), {
      message: `ApiKeyEscopos deve ser uma lista com pelo menos um destes: ${ESCOPOS_APIKEY_VALIDOS.join(", ")}`,
    })
    .min(1, "Selecione ao menos um escopo"),
});

export const ApiKeyQueryParamsSchema = z.object({
  EscolaGUID: z
    .string({ message: "EscolaGUID é obrigatório" })
    .min(1, "EscolaGUID é obrigatório")
    .regex(GUID_REGEX, "EscolaGUID inválido (deve ser UUID v4)"),
});
