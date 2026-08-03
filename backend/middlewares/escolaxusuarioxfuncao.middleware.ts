import {
  CriarEscolaxUsuarioxFuncaoBodySchema,
  AtualizarEscolaxUsuarioxFuncaoBodySchema,
  CriarEmMassaBodySchema,
  EscolaxUsuarioxFuncaoIdParamSchema,
} from "../schemas/escolaxusuarioxfuncao.schema";
import { zodValidate } from "../utils/zodValidate";

export default class EscolaxUsuarioxFuncaoMiddleware {
  validateCreateBody = zodValidate(CriarEscolaxUsuarioxFuncaoBodySchema, "body", "Erro na validacao de dados");

  validateUpdateBody = zodValidate(AtualizarEscolaxUsuarioxFuncaoBodySchema, "body", "Erro na validacao de dados");

  validateCreateEmMassaBody = zodValidate(CriarEmMassaBodySchema, "body", "Erro na validacao de dados");

  validateIdParam = zodValidate(EscolaxUsuarioxFuncaoIdParamSchema, "params", "Erro na validacao de dados");
}
