import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** `validateCodigoBody` original desembrulha de `body.verificacao` se existir; `validateReenviarBody` nunca desembrulha. */
function desembrulharVerificacao(body: unknown): unknown {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as Record<string, unknown>;
    if (b.verificacao && typeof b.verificacao === "object" && !Array.isArray(b.verificacao)) {
      return b.verificacao;
    }
  }
  return body;
}

const RawFieldsSchema = z.object({
  UsuarioGUID: z.string().optional(),
  UsuarioEmail: z.string().optional(),
  email: z.string().optional(),
  VerificacaoCodigo: z.string().optional(),
  codigo: z.string().optional(),
});

/**
 * Réplica fiel de `validateCodigoBody`: aceita GUID do usuário OU email (ao
 * menos um), valida formato de email, exige `VerificacaoCodigo`/`codigo` com
 * 6 dígitos numéricos — tudo isso via `.transform((raw, ctx) => ...)`, o
 * único jeito de combinar validação + saída num formato NOVO
 * (`{UsuarioGUID, UsuarioEmail, VerificacaoCodigo}`, sempre nessa forma
 * independente do input ter vindo plano ou aninhado em `verificacao`). O
 * resultado é escrito de volta em `request.body.verificacao` via
 * `zodValidate(..., {aposSucesso})`.
 */
export const ValidarCodigoBodySchema = z.preprocess(desembrulharVerificacao, RawFieldsSchema).transform((raw, ctx) => {
  const guidInput = raw.UsuarioGUID?.trim();
  const emailInput = (raw.UsuarioEmail || raw.email)?.trim();
  const codigoInput = (raw.VerificacaoCodigo || raw.codigo)?.trim();

  if (!guidInput && !emailInput) {
    ctx.addIssue({ code: "custom", message: "Informe 'UsuarioGUID' ou 'email' para validar o código." });
    return z.NEVER;
  }

  if (emailInput && !EMAIL_REGEX.test(emailInput)) {
    ctx.addIssue({ code: "custom", message: "O campo 'email' deve ser um email válido." });
    return z.NEVER;
  }

  if (!codigoInput) {
    ctx.addIssue({ code: "custom", message: "O campo 'VerificacaoCodigo' (ou 'codigo') é obrigatório." });
    return z.NEVER;
  }
  if (codigoInput.length !== 6) {
    ctx.addIssue({ code: "custom", message: "O código deve ter exatamente 6 dígitos." });
    return z.NEVER;
  }
  if (!/^\d{6}$/.test(codigoInput)) {
    ctx.addIssue({ code: "custom", message: "O código deve conter apenas dígitos numéricos (0-9)." });
    return z.NEVER;
  }

  return { UsuarioGUID: guidInput, UsuarioEmail: emailInput, VerificacaoCodigo: codigoInput };
});

/** `validateReenviarBody` — mesma lógica de GUID/email do código, sem exigir código, sem desembrulhar `verificacao`. */
export const ValidarReenviarBodySchema = RawFieldsSchema.transform((raw, ctx) => {
  const guidInput = raw.UsuarioGUID?.trim();
  const emailInput = (raw.UsuarioEmail || raw.email)?.trim();

  if (!guidInput && !emailInput) {
    ctx.addIssue({ code: "custom", message: "Informe 'UsuarioGUID' ou 'email' para reenviar o código." });
    return z.NEVER;
  }

  if (emailInput && !EMAIL_REGEX.test(emailInput)) {
    ctx.addIssue({ code: "custom", message: "O campo 'email' deve ser um email válido." });
    return z.NEVER;
  }

  return { UsuarioGUID: guidInput, UsuarioEmail: emailInput };
});

/** `validateGuidParam` — exige `params.UsuarioGUID` não vazio. */
export const GuidParamSchema = z
  .object({
    UsuarioGUID: z.string({ message: "O parâmetro 'UsuarioGUID' é obrigatório." }).min(1, "O parâmetro 'UsuarioGUID' é obrigatório."),
  })
  .transform((raw) => raw.UsuarioGUID.trim());
