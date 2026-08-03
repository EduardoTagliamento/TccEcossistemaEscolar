import {
  CriarAnotacaoBodySchema,
  AtualizarAnotacaoBodySchema,
  AnotacaoGUIDParamSchema,
  AnotacaoFiltrosQuerySchema,
} from "../schemas/anotacao.schema";
import { zodValidate } from "../utils/zodValidate";

export class AnotacaoMiddleware {
  static validarCreate = zodValidate(CriarAnotacaoBodySchema, "body", "", { semDetails: true });

  static validarUpdate = zodValidate(AtualizarAnotacaoBodySchema, "body", "", { semDetails: true });

  static validarGUID = zodValidate(AnotacaoGUIDParamSchema, "params", "", { semDetails: true });

  static validarFiltros = zodValidate(AnotacaoFiltrosQuerySchema, "query", "", { semDetails: true });
}
