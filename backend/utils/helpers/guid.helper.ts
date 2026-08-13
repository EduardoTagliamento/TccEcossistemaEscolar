/**
 * Geração de identificadores únicos (GUID) usados como PK/FK no sistema.
 *
 * Duas variantes coexistem de propósito — não é um formato migrando pro
 * outro, são dois formatos deliberadamente diferentes pra tabelas diferentes:
 *
 * - `gerarGUID()` — UUID v4 padrão (36 caracteres, com hifens). Formato que
 *   TODAS as colunas CHAR(36)/VARCHAR(36) do banco (escola, tarefa,
 *   matrícula, notificação, etc.), os setters de entidade (`.length !== 36`)
 *   e a maioria dos schemas Zod de validação de rota (regex de UUID
 *   hexadecimal hifenizado) esperam. Usar pra TUDO, exceto `usuario`.
 *
 * - `gerarGUIDUsuario()` — 12 caracteres em base64url (72 bits de entropia).
 *   `usuario.UsuarioGUID` é a ÚNICA coluna do banco que é `CHAR(12)`, não
 *   `CHAR(36)` — decisão deliberada de `2026-08-10-usuario-guid-pk.ts` (ver
 *   docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md), já aplicada em produção e usada
 *   pra fazer o backfill de todo usuário existente. `usuario.schema.ts`
 *   também tem seu próprio `GUID_REGEX` (`/^[A-Za-z0-9_-]{12}$/`) validando
 *   especificamente esse formato nas rotas `/api/usuario/:UsuarioGUID`. Usar
 *   SÓ pra gerar `usuario.UsuarioGUID` novo — nunca para outra tabela.
 *
 * ⚠️ Histórico: por um período breve, só existia uma função (`gerarGUID`)
 * gerando o formato de 12 caracteres pra tudo — quebrou a criação de
 * qualquer entidade fora de `usuario` (ex.: escola), já que só o schema de
 * `usuario` foi desenhado pra esse formato curto. Corrigido separando os
 * dois geradores. Se um novo domínio genuinamente precisar de um formato
 * de GUID diferente de novo, crie outra função nomeada — nunca reaproveite
 * `gerarGUID()` pra um formato diferente do UUID v4 padrão.
 */
import { randomUUID, randomBytes } from "crypto";

export function gerarGUID(): string {
  return randomUUID();
}

/** Só para `usuario.UsuarioGUID` — ver nota do arquivo acima. */
export function gerarGUIDUsuario(): string {
  return randomBytes(9).toString("base64url");
}
