/**
 * 🛣️  Rotas de Upload
 *
 * Define os endpoints para upload de arquivos (logos, imagens, anexos de mensagem etc).
 */

import { Router, Request, Response, NextFunction } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { EscolaDAO } from '../backend/repositories/escola.repository';
import { ConversaDAO } from '../backend/repositories/conversa.repository';
import { UsuarioDAO } from '../backend/repositories/usuario.repository';
import UploadService from '../backend/services/upload.service';
import UploadController from '../backend/controllers/upload.controller';
import {
  uploadMiddleware,
  validateFilePresence,
  handleMulterError,
  uploadMensagemMiddleware,
  handleMulterErrorMensagem,
} from '../backend/middlewares/upload.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';
import ErrorResponse from '../backend/utils/ErrorResponse';

// Instanciar dependências
const database = new MysqlDatabase();
const escolaDAO = new EscolaDAO(database);
const conversaDAO = new ConversaDAO(database);
const usuarioDAO = new UsuarioDAO(database);
const uploadService = new UploadService(escolaDAO, usuarioDAO);
const uploadController = new UploadController(uploadService);

// Criar router
const uploadRoutes = Router();

/**
 * Garante que o usuário autenticado é participante da conversa antes de
 * aceitar o upload do anexo — mesma regra aplicada em todo o módulo de
 * Conversa (ver docs/routes/conversa-api.md, Business Rules #2). Roda
 * antes do multer para não gastar banda/memória com upload não autorizado.
 */
async function verificarParticipanteConversa(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversaGUID = req.params.conversaGUID;
    const usuarioCPF = req.user!.UsuarioCPF;
    const participante = await conversaDAO.isParticipante(conversaGUID, usuarioCPF);
    if (!participante) {
      next(new ErrorResponse(403, 'Você não faz parte desta conversa'));
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}

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

/**
 * @route POST /api/upload/mensagem/:conversaGUID
 * @description Upload de anexo de mensagem de chat (max 10MB, imagens + documentos comuns)
 * @access Private (requer autenticação + ser participante da conversa)
 * @formData arquivo: File (campo multipart/form-data)
 * @returns { fileName, fileUrl, fileSize, mimeType, mensagemTipo }
 */
uploadRoutes.post(
  '/mensagem/:conversaGUID',
  AuthMiddleware.authenticate,
  verificarParticipanteConversa,
  uploadMensagemMiddleware.single('arquivo'),
  handleMulterErrorMensagem,
  validateFilePresence,
  uploadController.uploadMensagemAnexo
);

/**
 * Self-service: só o próprio usuário autenticado pode alterar a própria foto.
 */
function verificarProprioUsuario(req: Request, res: Response, next: NextFunction): void {
  const UsuarioCPF = req.params.UsuarioCPF;
  if (req.user?.UsuarioCPF !== UsuarioCPF) {
    next(new ErrorResponse(403, 'Você só pode alterar a própria foto de perfil'));
    return;
  }
  next();
}

/**
 * @route POST /api/upload/foto-usuario/:UsuarioCPF
 * @description Upload de foto de perfil do usuário (max 1MB, imagens PNG/JPG/JPEG — mesmo limite do logo)
 * @access Private (requer autenticação + ser o próprio usuário)
 * @formData foto: File (campo multipart/form-data)
 * @returns { fileName, fileUrl, fileSize, mimeType }
 */
uploadRoutes.post(
  '/foto-usuario/:UsuarioCPF',
  AuthMiddleware.authenticate,
  verificarProprioUsuario,
  uploadMiddleware.single('foto'),
  handleMulterError,
  validateFilePresence,
  uploadController.uploadFotoUsuario
);

/**
 * @route DELETE /api/upload/foto-usuario/:UsuarioCPF
 * @description Remove foto de perfil do usuário
 * @access Private (requer autenticação + ser o próprio usuário)
 * @returns { removed: boolean }
 */
uploadRoutes.delete(
  '/foto-usuario/:UsuarioCPF',
  AuthMiddleware.authenticate,
  verificarProprioUsuario,
  uploadController.deleteFotoUsuario
);

export default uploadRoutes;
