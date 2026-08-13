import { z } from "zod";

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// usuario.UsuarioGUID é CHAR(12) (base64url), formato diferente do UUID v4
// padrão usado por todo o resto do sistema — ver backend/utils/helpers/guid.helper.ts.
const GUID_USUARIO_REGEX = /^[A-Za-z0-9_-]{12}$/;

const guid = (campo: string) => z.string().regex(GUID_REGEX, `O parâmetro '${campo}' deve ser um UUID válido.`);
const guidUsuario = (campo: string) => z.string().regex(GUID_USUARIO_REGEX, `O parâmetro '${campo}' deve ser um GUID de usuário válido.`);

export const TarefaGUIDParamSchema = z.object({
  tarefaGUID: guid("tarefaGUID"),
});

export const GrupoGUIDParamSchema = z.object({
  grupoGUID: guid("grupoGUID"),
});

export const GrupoAndMembroParamsSchema = z.object({
  grupoGUID: guid("grupoGUID"),
  membroGUID: guidUsuario("membroGUID"),
});

export const NomeGrupoBodySchema = z.object({
  GrupoNome: z
    .string({ message: "O campo 'GrupoNome' é obrigatório e deve ser uma string." })
    .trim()
    .min(1, "O campo 'GrupoNome' deve ter entre 1 e 128 caracteres.")
    .max(128, "O campo 'GrupoNome' deve ter entre 1 e 128 caracteres."),
});

export const TransferirLiderBodySchema = z.object({
  NovoLiderGUID: guidUsuario("NovoLiderGUID"),
});
