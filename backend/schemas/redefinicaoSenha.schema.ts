import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const SolicitarRedefinicaoBodySchema = z
  .object({
    email: z.string({ message: "O campo 'email' é obrigatório." }).trim().min(1, "O campo 'email' é obrigatório."),
  })
  .transform((raw, ctx) => {
    if (!EMAIL_REGEX.test(raw.email)) {
      ctx.addIssue({ code: "custom", message: "O campo 'email' deve ser um email válido." });
      return z.NEVER;
    }
    return { email: raw.email };
  });

export const RedefinirSenhaBodySchema = z.object({
  token: z
    .string({ message: "O campo 'token' é obrigatório." })
    .trim()
    .regex(/^[a-f0-9]{64}$/, "Token de redefinição inválido."),
  novaSenha: z
    .string({ message: "O campo 'novaSenha' é obrigatório." })
    .min(6, "A nova senha deve ter pelo menos 6 caracteres."),
});
