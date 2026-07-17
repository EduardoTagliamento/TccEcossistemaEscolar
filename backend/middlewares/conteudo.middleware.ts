import { Request, Response, NextFunction } from "express";
import ErrorResponse from "../utils/ErrorResponse";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIPOS_VALIDOS = ["cronometrado", "texto", "paginado"];

export class ConteudoMiddleware {
  static validarCriacao = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 ConteudoMiddleware.validarCriacao()");

    const body = req.body;

    if (!body.MateriaGUID || !uuidRegex.test(body.MateriaGUID)) {
      return next(new ErrorResponse(400, "MateriaGUID inválido", {
        message: "MateriaGUID é obrigatório e deve ser um UUID válido",
      }));
    }

    if (!body.ConteudoTitulo || body.ConteudoTitulo.trim().length < 2) {
      return next(new ErrorResponse(400, "ConteudoTitulo inválido", {
        message: "ConteudoTitulo é obrigatório (mínimo 2 caracteres)",
      }));
    }

    if (!body.ConteudoTipo || !TIPOS_VALIDOS.includes(body.ConteudoTipo)) {
      return next(new ErrorResponse(400, "ConteudoTipo inválido", {
        message: `ConteudoTipo deve ser um dos: ${TIPOS_VALIDOS.join(", ")}`,
      }));
    }

    if (!body.TurmasGUID) {
      return next(new ErrorResponse(400, "TurmasGUID inválido", {
        message: "TurmasGUID é obrigatório (array JSON de UUIDs)",
      }));
    }

    if (!body.ConteudoDataPublicacao || isNaN(new Date(body.ConteudoDataPublicacao).getTime())) {
      return next(new ErrorResponse(400, "ConteudoDataPublicacao inválida", {
        message: "ConteudoDataPublicacao é obrigatória e deve ser uma data válida",
      }));
    }

    if (body.ConteudoTipo === "cronometrado" && body.OrigemTipo !== "upload" && body.OrigemTipo !== "link") {
      return next(new ErrorResponse(400, "OrigemTipo inválido", {
        message: "OrigemTipo deve ser 'upload' ou 'link' para conteúdo cronometrado",
      }));
    }

    if (body.ConteudoTipo === "texto" && (!body.ConteudoHtml || !body.ConteudoHtml.trim())) {
      return next(new ErrorResponse(400, "ConteudoHtml obrigatório", {
        message: "ConteudoHtml é obrigatório para conteúdo de texto",
      }));
    }

    next();
  };

  static validarGUID = (req: Request, res: Response, next: NextFunction) => {
    console.log("🟡 ConteudoMiddleware.validarGUID()");

    const { guid } = req.params;

    if (!guid || !uuidRegex.test(guid)) {
      return next(new ErrorResponse(400, "GUID inválido", {
        message: "O parâmetro GUID deve ser um UUID válido",
      }));
    }

    next();
  };
}
