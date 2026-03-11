/**
 * 🛣️  Rotas de Upload
 * 
 * Define os endpoints para upload de arquivos (logos, imagens, etc).
 */

import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase.js';
import { EscolaDAO } from '../backend/repositories/escola.repository.js';
import UploadService from '../backend/services/upload.service.js';
import UploadController from '../backend/controllers/upload.controller.js';
import { 
  uploadMiddleware, 
  validateFilePresence, 
  handleMulterError 
} from '../backend/middlewares/upload.middleware.js';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware.js';

// Instanciar dependências
const database = new MysqlDatabase();
const escolaDAO = new EscolaDAO(database);
const uploadService = new UploadService(escolaDAO);
const uploadController = new UploadController(uploadService);

// Criar router
const uploadRoutes = Router();

/**
 * @route POST /api/upload/logo/:EscolaGUID
 * @description Upload de logo de escola (max 1MB, imagens PNG/JPG/JPEG)
 * @access Private (requer autenticação)
 * @formData logo: File (campo multipart/form-data)
 * @returns { fileName, filePath, fileUrl, fileSize, mimeType }
 */
uploadRoutes.post(
  '/logo/:EscolaGUID',
  AuthMiddleware.authenticate,
  uploadMiddleware.single('logo'),
  handleMulterError,
  validateFilePresence,
  uploadController.uploadLogo
);

/**
 * @route DELETE /api/upload/logo/:EscolaGUID
 * @description Remove logo de escola
 * @access Private (requer autenticação)
 * @returns { removed: boolean }
 */
uploadRoutes.delete(
  '/logo/:EscolaGUID',
  AuthMiddleware.authenticate,
  uploadController.deleteLogo
);

export default uploadRoutes;
