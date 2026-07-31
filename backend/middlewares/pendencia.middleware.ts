/**
 * 🔷 Middleware - Pendência
 *
 * Validações de requisição HTTP para endpoints de pendência, via Zod
 * (ver backend/schemas/pendencia.schema.ts e backend/utils/zodValidate.ts).
 */

import {
  PendenciaGUIDParamSchema,
  CreatePendenciaBodySchema,
  UpdatePendenciaBodySchema,
  PendenciaQueryParamsSchema,
  PendenciaQueryContadorSchema,
} from "../schemas/pendencia.schema";
import { zodValidate } from "../utils/zodValidate";

/**
 * Classe de Middleware para Pendência
 */
export default class PendenciaMiddleware {
  static validarGUID = zodValidate(PendenciaGUIDParamSchema, "params", "", { semDetails: true });

  static validarCreate = zodValidate(CreatePendenciaBodySchema, "body", "", { semDetails: true });

  static validarUpdate = zodValidate(UpdatePendenciaBodySchema, "body", "", { semDetails: true });

  static validarQueryParams = zodValidate(PendenciaQueryParamsSchema, "query", "", { semDetails: true });

  static validarQueryContador = zodValidate(PendenciaQueryContadorSchema, "query", "", { semDetails: true });
}
