/**
 * Geração de identificadores únicos (GUID) usados como PK/FK no sistema.
 *
 * Formato: 12 caracteres em base64url (72 bits de entropia), gerados a
 * partir de bytes aleatórios criptograficamente seguros. Cabe sem
 * alteração nas colunas CHAR(36)/VARCHAR(36) já existentes no banco.
 * Substitui o uuidv4() (36 caracteres, com hifens) usado anteriormente.
 */
import { randomBytes } from "crypto";

export function gerarGUID(): string {
  return randomBytes(9).toString("base64url");
}
