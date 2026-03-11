/**
 * 📤 Middleware de Upload de Arquivos
 * 
 * Configura multer para upload de imagens (logos de escolas).
 * Valida tipo de arquivo e tamanho máximo.
 */

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import { Request } from 'express';
import ErrorResponse from '../utils/ErrorResponse.js';

// Diretório onde as imagens serão salvas
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'logos');

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
];

// Tamanho máximo: 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB em bytes

/**
 * Configuração de armazenamento do multer
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Gerar nome único: timestamp-random-originalname
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const originalName = file.originalname.replace(/\s+/g, '-').toLowerCase();
    const fileName = `${timestamp}-${randomString}-${originalName}`;
    
    cb(null, fileName);
  },
});

/**
 * Filtro para validar tipo de arquivo
 */
const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ErrorResponse(400, 'Tipo de arquivo inválido', {
      message: 'Apenas imagens PNG, JPG e JPEG são permitidas',
      allowedTypes: ALLOWED_MIME_TYPES,
      receivedType: file.mimetype,
    }) as any);
  }
};

/**
 * Configuração do multer
 */
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Middleware para validar se arquivo foi enviado
 */
export const validateFilePresence = (req: Request, res: any, next: any) => {
  if (!req.file) {
    return next(new ErrorResponse(400, 'Arquivo não fornecido', {
      message: 'Você deve enviar um arquivo de imagem',
    }));
  }
  
  next();
};

/**
 * Middleware para tratar erros do multer
 */
export const handleMulterError = (err: any, _req: Request, _res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ErrorResponse(400, 'Arquivo muito grande', {
        message: `O arquivo não pode ser maior que ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        maxSize: `${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      }));
    }
    
    return next(new ErrorResponse(400, 'Erro no upload', {
      message: err.message,
      code: err.code,
    }));
  }
  
  next(err);
};
