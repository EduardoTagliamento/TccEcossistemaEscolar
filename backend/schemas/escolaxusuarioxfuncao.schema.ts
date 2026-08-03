import { z } from "zod";

// Regex "solta" só desta rota — versão 1-5, case insensitive nos dois grupos
// (diferente da estrita v4-only usada na maioria dos outros domínios).
const GUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const CPF_FORMATADO_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_ENUM = ["Ativo", "Inativo", "Finalizado"] as const;

// Igual ao original: `Number(payload.FuncaoId)` — aceita number ou string
// numérica ("3"), não só `number`.
const campoFuncaoId = (obrigatorio: boolean) => {
  const base = z.unknown().refine((v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1;
  }, "O campo 'FuncaoId' deve ser um inteiro positivo.");
  return obrigatorio ? base : base.optional();
};

const campoCPF = (obrigatorio: boolean) => {
  const base = z.string({ message: "O campo 'UsuarioCPF' deve ser string." }).regex(CPF_FORMATADO_REGEX, "O campo 'UsuarioCPF' deve estar no formato XXX.XXX.XXX-XX.");
  return obrigatorio ? base : base.optional();
};

const campoEscolaGUID = (obrigatorio: boolean) => {
  const base = z.string({ message: "O campo 'EscolaGUID' deve ser string." }).regex(GUID_REGEX, "O campo 'EscolaGUID' deve ser um UUID valido.");
  return obrigatorio ? base : base.optional();
};

const campoData = (nomeCampo: string) =>
  z
    .string({ message: `O campo '${nomeCampo}' deve ser string no formato YYYY-MM-DD.` })
    .regex(DATA_REGEX, `O campo '${nomeCampo}' deve estar no formato YYYY-MM-DD.`)
    .optional();

const campoStatus = () => z.enum(STATUS_ENUM, { message: "O campo 'Status' deve ser 'Ativo', 'Inativo' ou 'Finalizado'." }).optional();

export const CriarEscolaxUsuarioxFuncaoBodySchema = z.object({
  escolaxusuarioxfuncao: z
    .object(
      {
        UsuarioCPF: campoCPF(true),
        EscolaGUID: campoEscolaGUID(true),
        FuncaoId: campoFuncaoId(true),
        DataInicio: campoData("DataInicio"),
        DataFim: campoData("DataFim"),
        Status: campoStatus(),
      },
      { message: "O campo 'escolaxusuarioxfuncao' e obrigatorio!" }
    ),
});

export const AtualizarEscolaxUsuarioxFuncaoBodySchema = z.object({
  escolaxusuarioxfuncao: z
    .object(
      {
        UsuarioCPF: campoCPF(false),
        EscolaGUID: campoEscolaGUID(false),
        FuncaoId: campoFuncaoId(false),
        DataInicio: campoData("DataInicio"),
        DataFim: campoData("DataFim"),
        Status: campoStatus(),
      },
      { message: "O campo 'escolaxusuarioxfuncao' e obrigatorio!" }
    )
    .refine(
      (v) =>
        v.UsuarioCPF !== undefined ||
        v.EscolaGUID !== undefined ||
        v.FuncaoId !== undefined ||
        v.DataInicio !== undefined ||
        v.DataFim !== undefined ||
        v.Status !== undefined,
      "Envie ao menos um campo para atualizar: UsuarioCPF, EscolaGUID, FuncaoId, DataInicio, DataFim ou Status."
    ),
});

export const CriarEmMassaBodySchema = z.object({
  EscolaGUID: z.string({ message: "O campo 'EscolaGUID' e obrigatorio!" }).min(1, "O campo 'EscolaGUID' e obrigatorio!"),
  FuncaoId: campoFuncaoId(true),
  itens: z
    .unknown()
    .refine((v) => Array.isArray(v) && v.length > 0, "O campo 'itens' e obrigatorio e deve ser uma lista nao vazia.")
    .refine(
      (v) =>
        !Array.isArray(v) ||
        v.every(
          (item: any) =>
            item &&
            typeof item === "object" &&
            typeof item.CPF === "string" &&
            item.CPF.trim() !== "" &&
            (item.Nome === undefined || typeof item.Nome === "string") &&
            (item.Email === undefined || typeof item.Email === "string")
        ),
      "Cada item de 'itens' deve ter 'CPF' (string nao vazia) e opcionalmente 'Nome'/'Email' (strings)."
    ),
});

export const EscolaxUsuarioxFuncaoIdParamSchema = z.object({
  EscolaxUsuarioxFuncaoId: z
    .unknown()
    .refine((v) => !(v === undefined || v === null || v === ""), "O parametro 'EscolaxUsuarioxFuncaoId' e obrigatorio!")
    .refine((v) => {
      if (v === undefined || v === null || v === "") return true;
      const n = Number(v);
      return Number.isInteger(n) && n >= 1;
    }, "O parametro 'EscolaxUsuarioxFuncaoId' deve ser um inteiro positivo."),
});
