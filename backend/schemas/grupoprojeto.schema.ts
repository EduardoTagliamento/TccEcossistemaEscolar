import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// usuario.UsuarioGUID é CHAR(12) (base64url), formato diferente do UUID v4
// padrão usado por todo o resto do sistema — ver backend/utils/helpers/guid.helper.ts.
const GUID_USUARIO_REGEX = /^[A-Za-z0-9_-]{12}$/;
const VISIBILIDADE_VALID = ["Aberto", "Fechado"] as const;

const guid = (campo: string) => z.string().regex(GUID_REGEX, `O parâmetro '${campo}' deve ser um UUID válido.`);
const guidUsuario = (campo: string) => z.string().regex(GUID_USUARIO_REGEX, `O parâmetro '${campo}' deve ser um GUID de usuário válido.`);

export const ProjetoGUIDParamSchema = z.object({
  projetoGUID: guid("projetoGUID"),
});

export const GrupoGUIDParamSchema = z.object({
  grupoGUID: guid("grupoGUID"),
});

export const GrupoAndMembroParamsSchema = z.object({
  grupoGUID: guid("grupoGUID"),
  membroGUID: guidUsuario("membroGUID"),
});

export const CreateGrupoBodySchema = z.object({
  ProjetoGUID: guid("ProjetoGUID"),
  GrupoProjetoProposta: z
    .string({ message: "O campo 'GrupoProjetoProposta' é obrigatório e deve ter entre 1 e 2048 caracteres." })
    .trim()
    .min(1, "O campo 'GrupoProjetoProposta' é obrigatório e deve ter entre 1 e 2048 caracteres.")
    .max(2048, "O campo 'GrupoProjetoProposta' é obrigatório e deve ter entre 1 e 2048 caracteres."),
  GrupoProjetoVisibilidade: z.enum(VISIBILIDADE_VALID, { message: "O campo 'GrupoProjetoVisibilidade' deve ser 'Aberto' ou 'Fechado'." }),
  GrupoProjetoNome: z.string().max(128, "O campo 'GrupoProjetoNome' deve ter no máximo 128 caracteres.").optional().nullable(),
});

export const UpdateGrupoBodySchema = z
  .object({
    GrupoProjetoNome: z.string().max(128, "O campo 'GrupoProjetoNome' deve ter no máximo 128 caracteres.").optional().nullable(),
    GrupoProjetoProposta: z
      .string()
      .trim()
      .min(1, "O campo 'GrupoProjetoProposta' deve ter entre 1 e 2048 caracteres.")
      .max(2048, "O campo 'GrupoProjetoProposta' deve ter entre 1 e 2048 caracteres.")
      .optional(),
    GrupoProjetoVisibilidade: z.enum(VISIBILIDADE_VALID, { message: "O campo 'GrupoProjetoVisibilidade' deve ser 'Aberto' ou 'Fechado'." }).optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: "Envie ao menos um campo para atualizar: GrupoProjetoNome, GrupoProjetoProposta, GrupoProjetoVisibilidade.",
  });

export const PontuacaoBodySchema = z.object({
  GrupoProjetoPontuacao: z.number({ message: "O campo 'GrupoProjetoPontuacao' é obrigatório e deve ser um número >= 0." }).min(0, "O campo 'GrupoProjetoPontuacao' é obrigatório e deve ser um número >= 0."),
});

export const AdicionarMembroBodySchema = z.object({
  UsuarioGUID: guidUsuario("UsuarioGUID"),
});

export const TransferirLiderBodySchema = z.object({
  NovoLiderGUID: guidUsuario("NovoLiderGUID"),
});

export const PermissoesBodySchema = z
  .object({
    PodeExpulsarMembros: z.boolean().optional(),
    PodeAtualizarGrupo: z.boolean().optional(),
    PodeSubmeterProjeto: z.boolean().optional(),
  })
  .refine((obj) => Object.values(obj).some((v) => v !== undefined), {
    message: "Envie ao menos uma permissão: PodeExpulsarMembros, PodeAtualizarGrupo, PodeSubmeterProjeto.",
  });
