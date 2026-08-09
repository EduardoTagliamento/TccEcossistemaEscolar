import {
  CriarAvisoBodySchema,
  AvisoGUIDParamSchema,
  AvisoFiltrosQuerySchema,
} from "../schemas/aviso.schema";
import { zodValidate } from "../utils/zodValidate";

export class AvisoMiddleware {
  static validarCreate = zodValidate(CriarAvisoBodySchema, "body", "", { semDetails: true });

  static validarGUID = zodValidate(AvisoGUIDParamSchema, "params", "", { semDetails: true });

  static validarFiltros = zodValidate(AvisoFiltrosQuerySchema, "query", "", { semDetails: true });
}
