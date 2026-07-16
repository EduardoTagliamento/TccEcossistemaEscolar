/**
 * 📤 Middleware de Upload de Conteúdo de Aula
 *
 * Aceita, dependendo do ConteudoTipo escolhido no formulário:
 * - campo "arquivo" (1 arquivo): vídeo/áudio do tipo "cronometrado" (quando
 *   OrigemTipo="upload", não usado quando for link do YouTube/etc).
 * - campo "arquivos" (N arquivos): PDF/PPTX/DOCX ou coleção de imagens do
 *   tipo "paginado".
 *
 * Armazenamento em memória — os arquivos vão para o Cloudflare R2 via
 * ConteudoService, nunca tocam o disco local.
 */

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

const ALLOWED_CRONOMETRADO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
];

const ALLOWED_PAGINADO_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Vídeo pode ser grande; limite generoso mas finito (upload direto, sem envio em partes)
const MAX_FILE_SIZE = 150 * 1024 * 1024; // 150MB

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const tiposPermitidos =
    file.fieldname === 'arquivo' ? ALLOWED_CRONOMETRADO_MIME_TYPES : ALLOWED_PAGINADO_MIME_TYPES;

  if (tiposPermitidos.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ErrorResponse(400, 'Tipo de arquivo inválido', {
      message: `Tipo de arquivo "${file.mimetype}" não é permitido para o campo "${file.fieldname}".`,
      allowedTypes: tiposPermitidos,
    }) as any);
  }
};

export const conteudoUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
}).fields([
  { name: 'arquivo', maxCount: 1 },
  { name: 'arquivos', maxCount: 30 },
]);

export const handleConteudoMulterError = (err: any, _req: Request, _res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ErrorResponse(400, 'Arquivo muito grande', {
        message: `O arquivo não pode ser maior que ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      }));
    }
    return next(new ErrorResponse(400, 'Erro no upload', { message: err.message, code: err.code }));
  }
  next(err);
};
