import { z } from "zod";

const CPF_FORMATADO_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const TELEFONE_FORMATADO_REGEX = /^\(\d{2}\) \d{5}-\d{4}$/;
const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_ENUM = ["Ativo", "Inativo", "Bloqueado"] as const;

/**
 * `UsuarioController.store()` aceita um corpo em massa (`{ usuarios: [...],
 * escolaNome?, enviarEmails? }`, usado por `aluno.api.ts::criarAlunosEmMassa`)
 * ALÉM do individual. `UsuarioMiddleware.validateCreateBody` original nunca
 * tratou esse formato — `extractUsuarioPayload` sempre tentava extrair um
 * `usuario` singular, então uma requisição em massa caía direto na
 * validação de campo único e sempre retornava 400 "UsuarioCPF é obrigatório"
 * antes de chegar no controller (que tem tratamento próprio, resiliente,
 * item a item, via `UsuarioService.criarUsuariosEmMassa`). Ou seja, cadastro
 * em massa de aluno estava quebrado na validação — nunca chegava a rodar.
 * Corrigido: `UsuarioMiddleware.validateCreateBody` (fora deste arquivo)
 * detecta `req.body.usuarios` sendo array e pula a validação de schema
 * único inteiramente, deixando o corpo passar como está — o service já
 * valida e acumula erro por item, não precisa (nem deve) de validação de
 * schema rígida aqui que rejeitaria a requisição inteira por um item ruim.
 */
export function ehCorpoEmMassa(body: unknown): boolean {
  return !!body && typeof body === "object" && !Array.isArray(body) && Array.isArray((body as Record<string, unknown>).usuarios);
}

/**
 * `validateCreateBody`/`validateUpdateBody` originais aceitam o corpo tanto
 * "achatado" (`{UsuarioCPF, ...}`) quanto envelopado (`{usuario: {...}}`) —
 * resolvido por `extractUsuarioPayload`. Replicado aqui via `z.preprocess`.
 */
function desembrulharUsuario(body: unknown): unknown {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const b = body as Record<string, unknown>;
    if (b.usuario && typeof b.usuario === "object" && !Array.isArray(b.usuario)) {
      return b.usuario;
    }
  }
  return body;
}

function normalizarCPF(v: string): string {
  const digitos = v.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
  }
  return v;
}

function normalizarTelefone(v: string): string {
  const digitos = v.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
  }
  return v;
}

// Campos "sempre opcionais" — idênticos entre criação e atualização.
const campoEmail = () =>
  z
    .string({ message: "O campo 'UsuarioEmail' deve ser string." })
    .max(60, "O campo 'UsuarioEmail' deve ter no máximo 60 caracteres.")
    .optional();

const campoId = () =>
  z
    .string({ message: "O campo 'UsuarioId' deve ser string." })
    .max(45, "O campo 'UsuarioId' deve ter no máximo 45 caracteres.")
    .optional();

const campoTelefone = () =>
  z
    .string({ message: "O campo 'UsuarioTelefone' deve ser string." })
    .transform(normalizarTelefone)
    .refine((v) => v.length === 15, "O campo 'UsuarioTelefone' deve ter 15 caracteres (formato: (XX) XXXXX-XXXX).")
    .refine((v) => TELEFONE_FORMATADO_REGEX.test(v), "O campo 'UsuarioTelefone' deve estar no formato (XX) XXXXX-XXXX.")
    .optional();

const campoDataNascimento = () =>
  z
    .string({ message: "O campo 'UsuarioDataNascimento' deve ser string." })
    .regex(DATA_REGEX, "O campo 'UsuarioDataNascimento' deve estar no formato YYYY-MM-DD.")
    .optional();

const campoStatus = () =>
  z
    .enum(STATUS_ENUM, { message: "O campo 'UsuarioStatus' deve ser 'Ativo', 'Inativo' ou 'Bloqueado'." })
    .optional();

const campoEmailVerificado = () =>
  z.boolean({ message: "O campo 'UsuarioEmailVerificado' deve ser boolean." }).optional();

// Campos com regra diferente entre criação (obrigatórios) e atualização (opcionais).
const campoCPF = (obrigatorio: boolean) => {
  const base = z
    .string({ message: obrigatorio ? "O campo 'UsuarioCPF' é obrigatório!" : "O campo 'UsuarioCPF' deve ser string." })
    .min(1, "O campo 'UsuarioCPF' é obrigatório!")
    .transform(normalizarCPF)
    .refine((v) => v.length === 14, "O campo 'UsuarioCPF' deve ter 14 caracteres (XXX.XXX.XXX-XX).");
  return obrigatorio ? base : base.optional();
};

const campoNome = (obrigatorio: boolean) => {
  const base = z
    .string({ message: obrigatorio ? "O campo 'UsuarioNome' é obrigatório!" : "O campo 'UsuarioNome' deve ser string." })
    .min(1, "O campo 'UsuarioNome' é obrigatório!")
    .refine((v) => v.length >= 3 && v.length <= 100, "O campo 'UsuarioNome' deve ter entre 3 e 100 caracteres.");
  return obrigatorio ? base : base.optional();
};

const campoSenha = (obrigatorio: boolean) => {
  const base = z
    .string({ message: obrigatorio ? "O campo 'UsuarioSenha' é obrigatório!" : "O campo 'UsuarioSenha' deve ser string." })
    .min(1, "O campo 'UsuarioSenha' é obrigatório!")
    .refine((v) => v.length >= 6, "O campo 'UsuarioSenha' deve ter pelo menos 6 caracteres.");
  return obrigatorio ? base : base.optional();
};

// `.passthrough()`: o middleware original só validava os campos em
// `camposPossiveis` e devolvia o MESMO objeto (com CPF/telefone
// normalizados), sem remover nenhuma outra chave. `atualizarUsuario` no
// frontend (`frontend/lib/api/usuario.api.ts`) manda também preferências de
// acessibilidade (`UsuarioTema`, `UsuarioModoDaltonico`, `UsuarioEscalaFonte`,
// `UsuarioReduzirMovimento`, `UsuarioAltoContraste`) que nunca fizeram parte
// da validação — sem `.passthrough()` (modo padrão do Zod é "strip", que
// remove chaves desconhecidas), esses campos seriam silenciosamente
// descartados antes de chegar no controller/service, quebrando a tela de
// preferências em "Meu Perfil".
export const UsuarioCreateBodySchema = z.preprocess(
  desembrulharUsuario,
  z
    .object({
      UsuarioCPF: campoCPF(true),
      UsuarioNome: campoNome(true),
      UsuarioSenha: campoSenha(true),
      UsuarioEmail: campoEmail(),
      UsuarioId: campoId(),
      UsuarioTelefone: campoTelefone(),
      UsuarioEmailVerificado: campoEmailVerificado(),
      UsuarioDataNascimento: campoDataNascimento(),
      UsuarioStatus: campoStatus(),
    })
    .passthrough()
);

export const UsuarioUpdateBodySchema = z.preprocess(
  desembrulharUsuario,
  z
    .object({
      UsuarioCPF: campoCPF(false),
      UsuarioNome: campoNome(false),
      UsuarioSenha: campoSenha(false),
      UsuarioEmail: campoEmail(),
      UsuarioId: campoId(),
      UsuarioTelefone: campoTelefone(),
      UsuarioEmailVerificado: campoEmailVerificado(),
      UsuarioDataNascimento: campoDataNascimento(),
      UsuarioStatus: campoStatus(),
    })
    .passthrough()
);

export const UsuarioSenhaBodySchema = z.object({
  SenhaAtual: z.string({ message: "O campo 'SenhaAtual' é obrigatório!" }).min(1, "O campo 'SenhaAtual' é obrigatório!"),
  NovaSenha: z
    .string({ message: "O campo 'NovaSenha' é obrigatório e deve ter pelo menos 6 caracteres." })
    .min(6, "O campo 'NovaSenha' é obrigatório e deve ter pelo menos 6 caracteres."),
});

export const UsuarioCPFParamSchema = z.object({
  UsuarioCPF: z
    .string({ message: "O parâmetro 'UsuarioCPF' é obrigatório!" })
    .regex(CPF_FORMATADO_REGEX, "O CPF deve estar no formato XXX.XXX.XXX-XX"),
});
