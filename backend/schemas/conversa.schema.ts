import { z } from "zod";
import { EMOJIS_REACAO_PERMITIDOS } from "../repositories/mensagem.repository";

export const ConversaGUIDParamSchema = z.object({
  guid: z
    .string({ message: "O identificador da conversa deve ser um UUID de 36 caracteres" })
    .trim()
    .length(36, "O identificador da conversa deve ser um UUID de 36 caracteres"),
});

export const MensagemGUIDParamSchema = z.object({
  msgGuid: z
    .string({ message: "O identificador da mensagem deve ser um UUID de 36 caracteres" })
    .trim()
    .length(36, "O identificador da mensagem deve ser um UUID de 36 caracteres"),
});

export const IniciarIndividualBodySchema = z.object({
  DestinatarioGUID: z
    .string({ message: "DestinatarioGUID é obrigatório" })
    .trim()
    .min(1, "DestinatarioGUID é obrigatório"),
});

export const UsuarioGUIDBodySchema = z.object({
  UsuarioGUID: z.string({ message: "UsuarioGUID é obrigatório" }).trim().min(1, "UsuarioGUID é obrigatório"),
});

export const UsuarioGUIDParamSchema = z.object({
  usuarioGUID: z.string({ message: "Identificador de usuário inválido" }).trim().min(1, "Identificador de usuário inválido"),
});

export const EditarBodySchema = z.object({
  MensagemConteudo: z
    .string({ message: "MensagemConteudo é obrigatório" })
    .trim()
    .min(1, "MensagemConteudo é obrigatório")
    .max(4000, "MensagemConteudo não pode exceder 4000 caracteres"),
});

const MENSAGEM_REACAO_INVALIDA = `ReacaoEmoji deve ser um dos suportados: ${EMOJIS_REACAO_PERMITIDOS.join(" ")}`;

export const ReacaoBodySchema = z.object({
  ReacaoEmoji: z
    .string({ message: MENSAGEM_REACAO_INVALIDA })
    .trim()
    .refine((v) => (EMOJIS_REACAO_PERMITIDOS as readonly string[]).includes(v), MENSAGEM_REACAO_INVALIDA),
});
