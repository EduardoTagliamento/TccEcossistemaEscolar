import {
  AtualizarConfiguracaoBodySchema,
  EscolaConfiguracaoGUIDParamSchema,
  mensagemTopoEscolaConfiguracao,
} from "../schemas/escolaconfiguracao.schema";
import { zodValidate } from "../utils/zodValidate";

export class EscolaConfiguracaoMiddleware {
  static validarEscolaGUID = zodValidate(EscolaConfiguracaoGUIDParamSchema, "params", mensagemTopoEscolaConfiguracao);

  static validarAtualizacao = zodValidate(AtualizarConfiguracaoBodySchema, "body", mensagemTopoEscolaConfiguracao);
}
