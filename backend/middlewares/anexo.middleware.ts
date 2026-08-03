import { NextFunction, Request, Response } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import { AnexoIdParamSchema, AnexoUploadBodySchema, AnexoFiltrosQuerySchema } from "../schemas/anexo.schema";
import { zodValidate } from "../utils/zodValidate";

const validarUploadBodyZod = zodValidate(AnexoUploadBodySchema, "body");

/**
 * Middleware de validação para anexos.
 */
export default class AnexoMiddleware {
  validateIdParam = zodValidate(AnexoIdParamSchema, "params");

  // A presença de `request.file` (setado pelo multer) não dá pra checar via
  // `schema.safeParse` (só enxerga body/params/query) — encadeado depois da
  // validação de schema, mesmo padrão usado em `ConversaMiddleware.validarIniciarIndividual`.
  validateUploadBody = (request: Request, response: Response, next: NextFunction): void => {
    validarUploadBodyZod(request, response, () => {
      if (!request.file) {
        throw new ErrorResponse(400, "Erro na validação de dados", {
          message: "Nenhum arquivo foi enviado. O campo 'file' é obrigatório.",
        });
      }
      next();
    });
  };

  validateFilters = zodValidate(AnexoFiltrosQuerySchema, "query");
}
