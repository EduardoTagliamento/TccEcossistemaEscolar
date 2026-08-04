/**
 * 📤 Middleware de Upload de Páginas de Material Didático
 *
 * Aceita N imagens (scan/foto de página) via campo "paginas" — armazenamento
 * em memória, sobem pro Cloudflare R2 via MaterialDidaticoService, mesmo
 * padrão de `conteudo-upload.middleware.ts`.
 */

import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import ErrorResponse from "../utils/ErrorResponse";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB por página
const MAX_PAGINAS_POR_UPLOAD = 50;

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ErrorResponse(400, "Tipo de arquivo inválido", {
        message: `Tipo de arquivo "${file.mimetype}" não é permitido. Envie a página como imagem (JPEG/PNG/WEBP).`,
        allowedTypes: ALLOWED_MIME_TYPES,
      }) as any
    );
  }
};

export const materialDidaticoUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
}).array("paginas", MAX_PAGINAS_POR_UPLOAD);

export const handleMaterialDidaticoMulterError = (err: any, _req: Request, _res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return next(
        new ErrorResponse(400, "Arquivo muito grande", {
          message: `Cada página não pode ser maior que ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        })
      );
    }
    return next(new ErrorResponse(400, "Erro no upload", { message: err.message, code: err.code }));
  }
  next(err);
};
