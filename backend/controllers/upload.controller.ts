/**
 * 📤 Controller de Upload
 * 
 * Gerencia requisições de upload de arquivos.
 */

import { Request, Response, NextFunction } from 'express';
import UploadService from '../services/upload.service.js';
import ErrorResponse from '../utils/ErrorResponse.js';

export default class UploadController {
  #uploadService: UploadService;

  constructor(uploadService: UploadService) {
    console.log('⬆️  UploadController.constructor()');
    this.#uploadService = uploadService;
  }

  /**
   * POST /api/upload/logo/:EscolaGUID
   * Upload de logo de escola
   */
  uploadLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('📥 [UploadController] POST /api/upload/logo/:EscolaGUID');

      const EscolaGUID = req.params.EscolaGUID;
      const file = req.file;

      if (!file) {
        throw new ErrorResponse(400, 'Arquivo não enviado', {
          message: 'Nenhum arquivo foi enviado na requisição',
        });
      }

      // Processar upload
      const result = await this.#uploadService.uploadEscolaLogo(EscolaGUID, file);

      res.status(200).json({
        success: true,
        message: 'Logo enviado com sucesso',
        data: {
          logo: result,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/upload/logo/:EscolaGUID
   * Remove logo de escola
   */
  deleteLogo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('📥 [UploadController] DELETE /api/upload/logo/:EscolaGUID');

      const EscolaGUID = req.params.EscolaGUID;

      // Remover logo
      const removed = await this.#uploadService.removeEscolaLogo(EscolaGUID);

      res.status(200).json({
        success: true,
        message: 'Logo removido com sucesso',
        data: { removed },
      });
    } catch (error) {
      next(error);
    }
  };
}
