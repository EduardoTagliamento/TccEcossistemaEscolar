/**
 * 📤 Serviço de Upload
 *
 * Gerencia upload de arquivos e atualização de registros no banco.
 * Os arquivos em si vão para o Cloudflare R2 (ver R2StorageService) — o
 * campo EscolaLogo guarda a URL pública completa do arquivo no bucket.
 */

import { EscolaDAO } from '../repositories/escola.repository';
import ErrorResponse from '../utils/ErrorResponse';
import R2StorageService from './r2storage.service';

export default class UploadService {
  #escolaDAO: EscolaDAO;

  constructor(escolaDAO: EscolaDAO) {
    console.log('⬆️  UploadService.constructor()');
    this.#escolaDAO = escolaDAO;
  }

  /**
   * Processa upload de logo de escola
   * Atualiza registro da escola com a URL pública do arquivo no R2
   */
  async uploadEscolaLogo(
    EscolaGUID: string,
    file: Express.Multer.File
  ): Promise<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }> {
    console.log(`📤 [UploadService] Processando logo da escola ${EscolaGUID}`);

    // 1. Verificar se escola existe
    const escola = await this.#escolaDAO.findById(EscolaGUID);

    if (!escola) {
      throw new ErrorResponse(404, 'Escola não encontrada', {
        message: `Escola com GUID ${EscolaGUID} não existe`,
      });
    }

    try {
      // 2. Enviar novo arquivo para o R2
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const originalName = file.originalname.replace(/\s+/g, '-').toLowerCase();
      const fileName = `${timestamp}-${randomString}-${originalName}`;
      const chave = `logos/${EscolaGUID}/${fileName}`;

      const fileUrl = await R2StorageService.upload(chave, file.buffer, file.mimetype);

      // 3. Se escola já tinha logo, remover o arquivo antigo do R2 (não bloqueia o fluxo se falhar)
      if (escola.EscolaLogo) {
        R2StorageService.removeByUrl(escola.EscolaLogo).catch((error) => {
          console.warn('⚠️  [UploadService] Falha ao remover logo antigo do R2:', error.message);
        });
      }

      // 4. Atualizar registro no banco com a URL pública
      escola.EscolaLogo = fileUrl;
      const updated = await this.#escolaDAO.update(escola);

      if (!updated) {
        throw new ErrorResponse(500, 'Erro ao atualizar escola', {
          message: 'Não foi possível salvar o logo da escola',
        });
      }

      console.log(`✅ [UploadService] Logo salvo com sucesso: ${fileUrl}`);

      return {
        fileName,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      if (error instanceof ErrorResponse) {
        throw error;
      }

      console.error('❌ [UploadService] Erro ao processar upload:', error);
      throw new ErrorResponse(500, 'Erro ao processar upload', {
        message: 'Falha ao salvar arquivo',
      });
    }
  }

  /**
   * Remove logo de escola
   */
  async removeEscolaLogo(EscolaGUID: string): Promise<boolean> {
    console.log(`🗑️  [UploadService] Removendo logo da escola ${EscolaGUID}`);

    try {
      // 1. Buscar escola
      const escola = await this.#escolaDAO.findById(EscolaGUID);

      if (!escola) {
        throw new ErrorResponse(404, 'Escola não encontrada', {
          message: `Escola com GUID ${EscolaGUID} não existe`,
        });
      }

      if (!escola.EscolaLogo) {
        throw new ErrorResponse(400, 'Escola não possui logo', {
          message: 'Não há logo para remover',
        });
      }

      // 2. Remover arquivo do R2
      await R2StorageService.removeByUrl(escola.EscolaLogo);

      // 3. Atualizar registro no banco
      escola.EscolaLogo = null;
      const updated = await this.#escolaDAO.update(escola);

      console.log(`✅ [UploadService] Logo removido com sucesso`);
      return updated;
    } catch (error: any) {
      if (error instanceof ErrorResponse) {
        throw error;
      }

      console.error('❌ [UploadService] Erro ao remover logo:', error);
      throw new ErrorResponse(500, 'Erro ao remover logo', {
        message: 'Falha ao remover arquivo',
      });
    }
  }
}
