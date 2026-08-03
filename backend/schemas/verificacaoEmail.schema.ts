import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizarCPF(digits: string): string {
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

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
  UsuarioCPF: z.string().optional(),
  UsuarioEmail: z.string().optional(),
  email: z.string().optional(),
  VerificacaoCodigo: z.string().optional(),
  codigo: z.string().optional(),
});

/**
 * Réplica fiel de `validateCodigoBody`: aceita CPF OU email (ao menos um),
 * normaliza CPF pro formato mascarado, valida formato de email, exige
 * `VerificacaoCodigo`/`codigo` com 6 dígitos numéricos — tudo isso via
 * `.transform((raw, ctx) => ...)`, o único jeito de combinar validação +
 * normalização + saída num formato NOVO (`{UsuarioCPF, UsuarioEmail,
 * VerificacaoCodigo}`, sempre nessa forma independente do input ter vindo
 * plano ou aninhado em `verificacao`). O resultado é escrito de volta em
 * `request.body.verificacao` via `zodValidate(..., {aposSucesso})`.
 */
export const ValidarCodigoBodySchema = z.preprocess(desembrulharVerificacao, RawFieldsSchema).transform((raw, ctx) => {
  const cpfInput = raw.UsuarioCPF?.trim();
  const emailInput = (raw.UsuarioEmail || raw.email)?.trim();
  const codigoInput = (raw.VerificacaoCodigo || raw.codigo)?.trim();

  if (!cpfInput && !emailInput) {
    ctx.addIssue({ code: "custom", message: "Informe 'UsuarioCPF' ou 'email' para validar o código." });
    return z.NEVER;
  }

  let cpfNormalizado: string | undefined;
  if (cpfInput) {
    const digits = cpfInput.replace(/\D/g, "");
    if (digits.length !== 11) {
      ctx.addIssue({ code: "custom", message: "O CPF deve ter 11 dígitos." });
      return z.NEVER;
    }
    cpfNormalizado = normalizarCPF(digits);
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

  return { UsuarioCPF: cpfNormalizado, UsuarioEmail: emailInput, VerificacaoCodigo: codigoInput };
});

/** `validateReenviarBody` — mesma lógica de CPF/email do código, sem exigir código, sem desembrulhar `verificacao`. */
export const ValidarReenviarBodySchema = RawFieldsSchema.transform((raw, ctx) => {
  const cpfInput = raw.UsuarioCPF?.trim();
  const emailInput = (raw.UsuarioEmail || raw.email)?.trim();

  if (!cpfInput && !emailInput) {
    ctx.addIssue({ code: "custom", message: "Informe 'UsuarioCPF' ou 'email' para reenviar o código." });
    return z.NEVER;
  }

  let cpfNormalizado: string | undefined;
  if (cpfInput) {
    const digits = cpfInput.replace(/\D/g, "");
    if (digits.length !== 11) {
      ctx.addIssue({ code: "custom", message: "O CPF deve ter 11 dígitos." });
      return z.NEVER;
    }
    cpfNormalizado = normalizarCPF(digits);
  }

  if (emailInput && !EMAIL_REGEX.test(emailInput)) {
    ctx.addIssue({ code: "custom", message: "O campo 'email' deve ser um email válido." });
    return z.NEVER;
  }

  return { UsuarioCPF: cpfNormalizado, UsuarioEmail: emailInput };
});

/** `validateCpfParam` — normaliza `params.UsuarioCPF` pro formato mascarado, escrito de volta via `aposSucesso`. */
export const CpfParamSchema = z
  .object({
    UsuarioCPF: z.string({ message: "O parâmetro 'UsuarioCPF' é obrigatório." }).min(1, "O parâmetro 'UsuarioCPF' é obrigatório."),
  })
  .transform((raw, ctx) => {
    const digits = raw.UsuarioCPF.replace(/\D/g, "");
    if (digits.length !== 11) {
      ctx.addIssue({ code: "custom", message: "O CPF deve ter 11 dígitos." });
      return z.NEVER;
    }
    return normalizarCPF(digits);
  });
