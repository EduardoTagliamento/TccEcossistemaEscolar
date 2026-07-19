/**
 * 📤 Middleware de Upload de Arquivos
 *
 * Configura multer para upload de imagens (logos de escolas).
 * Valida tipo de arquivo e tamanho máximo.
 *
 * Armazenamento em memória (não em disco): o arquivo é recebido como buffer
 * e enviado para o Cloudflare R2 pelo UploadService — o disco local do
 * processo é efêmero (ex: Railway apaga tudo a cada redeploy/restart).
 */

import multer, { FileFilterCallback } from 'multer';
import { Request } from 'express';
import ErrorResponse from '../utils/ErrorResponse';

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
];

// Tamanho máximo: 1MB
const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB em bytes

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
 * Configuração do multer (buffer em memória, sem tocar o disco)
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
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

/**
 * ---- Anexo de mensagem (Chat / módulo Conversa) ----
 *
 * Mesmo padrão do upload de logo (multer em memória → Cloudflare R2), mas
 * com tipos e limite de tamanho mais amplos: além de imagem (renderizada
 * inline na bolha do chat, `MensagemTipo='Imagem'`), aceita documentos
 * comuns como anexo genérico (`MensagemTipo='Arquivo'`, exibido como link
 * de download). 10MB é o limite adotado — maior que o 1MB do logo (que é
 * só ícone pequeno), mas ainda contido o bastante para um anexo de chat.
 */
const ALLOWED_MIME_TYPES_MENSAGEM = [
  // Imagens
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  // Documentos comuns
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'text/plain',
];

const MAX_FILE_SIZE_MENSAGEM = 10 * 1024 * 1024; // 10MB em bytes

const fileFilterMensagem = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES_MENSAGEM.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ErrorResponse(400, 'Tipo de arquivo inválido', {
      message: 'Tipo de anexo não suportado para mensagens de chat',
      allowedTypes: ALLOWED_MIME_TYPES_MENSAGEM,
      receivedType: file.mimetype,
    }) as any);
  }
};

export const uploadMensagemMiddleware = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilterMensagem,
  limits: {
    fileSize: MAX_FILE_SIZE_MENSAGEM,
  },
});

export const handleMulterErrorMensagem = (err: any, _req: Request, _res: any, next: any) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new ErrorResponse(400, 'Arquivo muito grande', {
        message: `O anexo não pode ser maior que ${MAX_FILE_SIZE_MENSAGEM / (1024 * 1024)}MB`,
        maxSize: `${MAX_FILE_SIZE_MENSAGEM / (1024 * 1024)}MB`,
      }));
    }

    return next(new ErrorResponse(400, 'Erro no upload', {
      message: err.message,
      code: err.code,
    }));
  }

  next(err);
};
