import { z } from "zod";

const CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const TELEFONE_REGEX = /^\(\d{2}\) \d{5}-\d{4}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STATUS_ENUM = ["Ativa", "Inativa"] as const;

/**
 * `validateCreateBody`/`validateUpdateBody` originais aceitam o corpo achatado
 * ou envelopado (`{escola: {...}}`), mapeiam os aliases legados
 * `EscolaCor1..4` pros nomes atuais (`EscolaCorPriEs` etc.), removem os
 * aliases, normalizam CNPJ/telefone crus e tiram o `#` de cor em hex —
 * tudo ANTES da validação de campo. Replicado aqui via `z.preprocess`
 * (equivalente a `extractEscolaPayload` + `normalizeEscolaCampos`).
 */
function prepararEscola(body: unknown): unknown {
  if (!body || typeof body !== "object" || Array.isArray(body)) return body;
  const b = body as Record<string, unknown>;
  const base = b.escola && typeof b.escola === "object" && !Array.isArray(b.escola) ? (b.escola as Record<string, unknown>) : b;
  const escola: Record<string, unknown> = { ...base };

  if (escola.EscolaCorPriEs === undefined && typeof escola.EscolaCor1 === "string") escola.EscolaCorPriEs = escola.EscolaCor1;
  if (escola.EscolaCorPriCl === undefined && typeof escola.EscolaCor2 === "string") escola.EscolaCorPriCl = escola.EscolaCor2;
  if (escola.EscolaCorSecEs === undefined && typeof escola.EscolaCor3 === "string") escola.EscolaCorSecEs = escola.EscolaCor3;
  if (escola.EscolaCorSecCl === undefined && typeof escola.EscolaCor4 === "string") escola.EscolaCorSecCl = escola.EscolaCor4;
  delete escola.EscolaCor1;
  delete escola.EscolaCor2;
  delete escola.EscolaCor3;
  delete escola.EscolaCor4;

  if (typeof escola.EscolaCNPJ === "string") {
    const digitos = escola.EscolaCNPJ.replace(/\D/g, "");
    if (digitos.length === 14) {
      escola.EscolaCNPJ = `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12, 14)}`;
    }
  }

  if (typeof escola.EscolaTelefone === "string") {
    const digitos = escola.EscolaTelefone.replace(/\D/g, "");
    if (digitos.length === 11) {
      escola.EscolaTelefone = `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
    }
  }

  for (const campo of ["EscolaCorPriEs", "EscolaCorPriCl", "EscolaCorSecEs", "EscolaCorSecCl"]) {
    if (typeof escola[campo] === "string") {
      escola[campo] = (escola[campo] as string).trim().replace(/^#/, "");
    }
  }

  return escola;
}

const campoCorOuIcone = (mensagem: string) => z.string({ message: mensagem }).nullable().optional();

// `.passthrough()`: preserva campos fora de `camposPossiveis` do middleware
// original (ex.: `EscolaIsTecnica`, enviado por `frontend/lib/api/escola.api.ts`
// mas nunca validado ali) — sem isso o modo padrão "strip" do Zod descartaria
// silenciosamente esse campo antes do controller/service.
export const EscolaCreateBodySchema = z.preprocess(
  prepararEscola,
  z
    .object({
      EscolaNome: z.string({ message: "O campo 'EscolaNome' é obrigatório!" }).min(1, "O campo 'EscolaNome' é obrigatório!"),
      EscolaCNPJ: z.string({ message: "O campo 'EscolaCNPJ' deve ser string." }).regex(CNPJ_REGEX, "O campo 'EscolaCNPJ' deve estar no formato XX.XXX.XXX/XXXX-XX.").nullable().optional(),
      EscolaTelefone: z.string({ message: "O campo 'EscolaTelefone' deve ser string." }).regex(TELEFONE_REGEX, "O campo 'EscolaTelefone' deve estar no formato (XX) XXXXX-XXXX.").nullable().optional(),
      EscolaEmail: z.string({ message: "O campo 'EscolaEmail' deve ser string." }).max(60, "O campo 'EscolaEmail' deve ser um email válido com no máximo 60 caracteres.").regex(EMAIL_REGEX, "O campo 'EscolaEmail' deve ser um email válido com no máximo 60 caracteres.").nullable().optional(),
      EscolaEndereco: z.string({ message: "O campo 'EscolaEndereco' deve ser string." }).max(200, "O campo 'EscolaEndereco' deve ter no máximo 200 caracteres.").nullable().optional(),
      EscolaCorPriEs: campoCorOuIcone("O campo 'EscolaCorPriEs' deve ser string."),
      EscolaCorPriCl: campoCorOuIcone("O campo 'EscolaCorPriCl' deve ser string."),
      EscolaCorSecEs: campoCorOuIcone("O campo 'EscolaCorSecEs' deve ser string."),
      EscolaCorSecCl: campoCorOuIcone("O campo 'EscolaCorSecCl' deve ser string."),
      EscolaIcone: campoCorOuIcone("O campo 'EscolaIcone' deve ser string."),
      EscolaStatus: z.enum(STATUS_ENUM, { message: "O campo 'EscolaStatus' deve ser 'Ativa' ou 'Inativa'." }).optional(),
    })
    .passthrough()
);

export const EscolaUpdateBodySchema = z.preprocess(
  prepararEscola,
  z
    .object({
      EscolaNome: z.string({ message: "O campo 'EscolaNome' deve ser string." }).optional(),
      EscolaCNPJ: z.string({ message: "O campo 'EscolaCNPJ' deve ser string." }).regex(CNPJ_REGEX, "O campo 'EscolaCNPJ' deve estar no formato XX.XXX.XXX/XXXX-XX.").nullable().optional(),
      EscolaTelefone: z.string({ message: "O campo 'EscolaTelefone' deve ser string." }).regex(TELEFONE_REGEX, "O campo 'EscolaTelefone' deve estar no formato (XX) XXXXX-XXXX.").nullable().optional(),
      EscolaEmail: z.string({ message: "O campo 'EscolaEmail' deve ser string." }).max(60, "O campo 'EscolaEmail' deve ser um email válido com no máximo 60 caracteres.").regex(EMAIL_REGEX, "O campo 'EscolaEmail' deve ser um email válido com no máximo 60 caracteres.").nullable().optional(),
      EscolaEndereco: z.string({ message: "O campo 'EscolaEndereco' deve ser string." }).max(200, "O campo 'EscolaEndereco' deve ter no máximo 200 caracteres.").nullable().optional(),
      EscolaCorPriEs: campoCorOuIcone("O campo 'EscolaCorPriEs' deve ser string."),
      EscolaCorPriCl: campoCorOuIcone("O campo 'EscolaCorPriCl' deve ser string."),
      EscolaCorSecEs: campoCorOuIcone("O campo 'EscolaCorSecEs' deve ser string."),
      EscolaCorSecCl: campoCorOuIcone("O campo 'EscolaCorSecCl' deve ser string."),
      EscolaIcone: campoCorOuIcone("O campo 'EscolaIcone' deve ser string."),
      EscolaStatus: z.enum(STATUS_ENUM, { message: "O campo 'EscolaStatus' deve ser 'Ativa' ou 'Inativa'." }).optional(),
    })
    .passthrough()
);

export const EscolaTransferirDirecaoBodySchema = z.object({
  NovoDirecaoCPF: z
    .string({ message: "O campo 'NovoDirecaoCPF' é obrigatório." })
    .trim()
    .min(1, "O campo 'NovoDirecaoCPF' é obrigatório."),
});

export const EscolaIdParamSchema = z.object({
  EscolaGUID: z.string({ message: "O parâmetro 'EscolaGUID' é obrigatório!" }).min(1, "O parâmetro 'EscolaGUID' é obrigatório!"),
});
