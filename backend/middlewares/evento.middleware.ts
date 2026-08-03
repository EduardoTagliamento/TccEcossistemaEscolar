import { EventoGUIDParamSchema, CreateEventoBodySchema, UpdateEventoBodySchema, EventoQueryParamsSchema } from "../schemas/evento.schema";
import { zodValidate } from "../utils/zodValidate";

/**
 * Classe de Middleware para Evento — via Zod
 * (ver backend/schemas/evento.schema.ts e backend/utils/zodValidate.ts).
 */
export default class EventoMiddleware {
  static validarGUID = zodValidate(EventoGUIDParamSchema, "params", "", { semDetails: true });

  static validarCreate = zodValidate(CreateEventoBodySchema, "body", "", { semDetails: true });

  static validarUpdate = zodValidate(UpdateEventoBodySchema, "body", "", { semDetails: true });

  static validarQueryParams = zodValidate(EventoQueryParamsSchema, "query", "", { semDetails: true });
}
