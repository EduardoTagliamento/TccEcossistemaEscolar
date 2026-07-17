/**
 * 📤 Middleware de Upload de Anexos
 *
 * Configura multer para upload de arquivos diversos (anexos).
 * Valida tipo de arquivo e tamanho máximo.
 * Diferente do upload.middleware.ts (logos), aceita mais tipos e maior tamanho.
 *
 * Armazenamento em memória (não em disco): o arquivo é recebido como buffer
 * e enviado para o Cloudflare R2 pelo AnexoService.
 */

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

// Tipos MIME permitidos (mais abrangente que logos)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',                                                      // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',                                                // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'text/plain',
  'application/zip',
];

// Tamanho máximo: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Filtro de tipos permitidos
 */
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ErrorResponse(400, 'Tipo de arquivo não permitido', {
      message: 'Apenas PDF, imagens, documentos Word/Excel, TXT e ZIP são permitidos',
      allowedTypes: ALLOWED_MIME_TYPES,
      receivedType: file.mimetype,
    }) as any);
  }
};

/**
 * Configuração do multer para anexos (buffer em memória)
 */
export const anexoUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Middleware para validar se arquivo foi enviado
 * Deve ser usado APÓS o multer processar
 */
export const validateFilePresence = (req: Request, res: any, next: any) => {
  if (!req.file) {
    throw new ErrorResponse(400, 'Nenhum arquivo enviado', {
      message: 'É obrigatório enviar um arquivo no campo "file"',
    });
  }
  next();
};
