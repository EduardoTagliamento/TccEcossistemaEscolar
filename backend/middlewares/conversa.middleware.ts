import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";
import {
  ConversaGUIDParamSchema,
  MensagemGUIDParamSchema,
  IniciarIndividualBodySchema,
  CPFBodySchema,
  CPFParamSchema,
  EditarBodySchema,
  ReacaoBodySchema,
} from "../schemas/conversa.schema";
import { zodValidate } from "../utils/zodValidate";

const validarDestinatarioCPFZod = zodValidate(IniciarIndividualBodySchema, "body", "", { semDetails: true });

export class ConversaMiddleware {
  static validarGUID = zodValidate(ConversaGUIDParamSchema, "params", "", { semDetails: true });

  static validarMsgGUID = zodValidate(MensagemGUIDParamSchema, "params", "", { semDetails: true });

  // Além de validar o formato via Zod, precisa comparar com `req.user`
  // (setado pelo AuthMiddleware) — fora do alcance de `schema.safeParse`,
  // que só enxerga body/params/query. Encadeado como uma checagem extra
  // depois da validação de schema, não dá pra modelar só com Zod.
  static validarIniciarIndividual = (req: Request, res: Response, next: NextFunction): void => {
    validarDestinatarioCPFZod(req, res, () => {
      if (req.body.DestinatarioCPF.trim() === req.user?.UsuarioCPF) {
        throw new ErrorResponse(400, "Não é possível iniciar uma conversa consigo mesmo");
      }
      next();
    });
  };

  static validarCPFBody = zodValidate(CPFBodySchema, "body", "", { semDetails: true });

  static validarCPFParam = zodValidate(CPFParamSchema, "params", "", { semDetails: true });

  static validarEditarBody = zodValidate(EditarBodySchema, "body", "", { semDetails: true });

  static validarReacaoBody = zodValidate(ReacaoBodySchema, "body", "", { semDetails: true });
}
