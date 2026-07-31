import {
  ProfessorListagemQuerySchema,
  ProfessorAlocacoesParamsSchema,
  CriarAlocacaoBodySchema,
  AtualizarAlocacaoBodySchema,
  AlocacaoGUIDParamSchema,
} from "../schemas/professor.schema";
import { zodValidate } from "../utils/zodValidate";

/**
 * Middleware de validação para rotas de Professor e Alocações — via Zod
 * (ver backend/schemas/professor.schema.ts e backend/utils/zodValidate.ts).
 */
export class ProfessorMiddleware {
  static validarListagemProfessores = zodValidate(ProfessorListagemQuerySchema, "query", "", { semDetails: true });

  static validarBuscarAlocacoesProfessor = zodValidate(ProfessorAlocacoesParamsSchema, "params", "", { semDetails: true });

  static validarCriacaoAlocacao = zodValidate(CriarAlocacaoBodySchema, "body", "", { semDetails: true });

  static validarAtualizacaoAlocacao = zodValidate(AtualizarAlocacaoBodySchema, "body", "", { semDetails: true });

  static validarGUID = zodValidate(AlocacaoGUIDParamSchema, "params", "", { semDetails: true });
}
