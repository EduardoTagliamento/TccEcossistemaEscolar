import { Request, Response, NextFunction } from "express";
import {
  ProfessorListagemQuerySchema,
  ProfessorAlocacoesParamsSchema,
  CriarAlocacaoBodySchema,
  AtualizarAlocacaoBodySchema,
  AlocacaoGUIDParamSchema,
  ehCorpoEmMassaAlocacao,
} from "../schemas/professor.schema";
import { zodValidate } from "../utils/zodValidate";

const validarCriacaoAlocacaoZod = zodValidate(CriarAlocacaoBodySchema, "body", "", { semDetails: true });

/**
 * Middleware de validação para rotas de Professor e Alocações — via Zod
 * (ver backend/schemas/professor.schema.ts e backend/utils/zodValidate.ts).
 */
export class ProfessorMiddleware {
  static validarListagemProfessores = zodValidate(ProfessorListagemQuerySchema, "query", "", { semDetails: true });

  static validarBuscarAlocacoesProfessor = zodValidate(ProfessorAlocacoesParamsSchema, "params", "", { semDetails: true });

  static validarCriacaoAlocacao = (request: Request, response: Response, next: NextFunction): void => {
    // Corpo em massa (`{alocacoes: [...]}`) não passa pela validação de
    // alocação única — o controller/service já trata item a item, resolvendo
    // MateriaNome/TurmaNome (ver ehCorpoEmMassaAlocacao em professor.schema.ts).
    if (ehCorpoEmMassaAlocacao(request.body)) {
      next();
      return;
    }
    validarCriacaoAlocacaoZod(request, response, next);
  };

  static validarAtualizacaoAlocacao = zodValidate(AtualizarAlocacaoBodySchema, "body", "", { semDetails: true });

  static validarGUID = zodValidate(AlocacaoGUIDParamSchema, "params", "", { semDetails: true });
}
