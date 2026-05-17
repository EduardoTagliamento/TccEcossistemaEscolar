/**
 * 📤 Middleware de Upload de Anexos
 * 
 * Configura multer para upload de arquivos diversos (anexos).
 * Valida tipo de arquivo e tamanho máximo.
 * Diferente do upload.middleware.ts (logos), aceita mais tipos e maior tamanho.
 */

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

// Diretório de upload para anexos
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'anexos');

// Garante que o diretório exista
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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
 * Configuração de armazenamento do multer
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  }
});

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
 * Configuração do multer para anexos
 */
export const anexoUploadMiddleware = multer({
  storage,
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
