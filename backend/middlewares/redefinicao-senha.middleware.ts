import { SolicitarRedefinicaoBodySchema, RedefinirSenhaBodySchema } from "../schemas/redefinicaoSenha.schema";
import { zodValidate } from "../utils/zodValidate";

export default class RedefinicaoSenhaMiddleware {
  constructor() {
    console.log("⬆️  RedefinicaoSenhaMiddleware.constructor()");
  }

  validateSolicitarBody = zodValidate(SolicitarRedefinicaoBodySchema, "body", "Erro na validação de dados");

  validateRedefinirBody = zodValidate(RedefinirSenhaBodySchema, "body", "Erro na validação de dados");
}
