import { CalendarioFiltrosQuerySchema, CalendarioDiaParamSchema } from "../schemas/calendario.schema";
import { zodValidate } from "../utils/zodValidate";

export default class CalendarioMiddleware {
  validateFilters = zodValidate(CalendarioFiltrosQuerySchema, "query");

  validateDiaParam = zodValidate(CalendarioDiaParamSchema, "params");
}
