import { CriarSugestaoBodySchema, SugestaoGUIDParamSchema } from "../schemas/sugestao.schema";
import { zodValidate } from "../utils/zodValidate";

export class SugestaoMiddleware {
  static validarCreate = zodValidate(CriarSugestaoBodySchema, "body", "", { semDetails: true });

  static validarGUID = zodValidate(SugestaoGUIDParamSchema, "params", "", { semDetails: true });
}
