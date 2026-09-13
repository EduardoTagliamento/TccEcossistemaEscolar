import { ApiKeyGUIDParamSchema, CreateApiKeyBodySchema, ApiKeyQueryParamsSchema } from "../schemas/apikey.schema";
import { zodValidate } from "../utils/zodValidate";

/**
 * Middleware de validação (Zod) para as rotas de gestão de ApiKey.
 * Ver backend/middlewares/apikey-auth.middleware.ts para a validação de
 * chave de API USADA como credencial (detecção `baua_...` no AuthMiddleware) —
 * são dois arquivos deliberadamente separados: este aqui valida payload
 * HTTP, aquele autentica o chamador.
 */
export default class ApiKeyMiddleware {
  static validarGUID = zodValidate(ApiKeyGUIDParamSchema, "params", "", { semDetails: true });

  static validarCreate = zodValidate(CreateApiKeyBodySchema, "body", "", { semDetails: true });

  static validarQueryParams = zodValidate(ApiKeyQueryParamsSchema, "query", "", { semDetails: true });
}
