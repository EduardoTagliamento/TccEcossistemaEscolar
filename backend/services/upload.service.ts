/**
 * 📤 Serviço de Upload
 * 
 * Gerencia upload de arquivos e atualização de registros no banco.
 */

import fs from 'fs';
import path from 'path';
import { EscolaDAO } from '../repositories/escola.repository.js';
import ErrorResponse from '../utils/ErrorResponse.js';

export default class UploadService {
  #escolaDAO: EscolaDAO;

  constructor(escolaDAO: EscolaDAO) {
    console.log('⬆️  UploadService.constructor()');
    this.#escolaDAO = escolaDAO;
  }

  /**
   * Processa upload de logo de escola
   * Atualiza registro da escola com caminho do arquivo
   */
  async uploadEscolaLogo(
    EscolaGUID: string,
    file: Express.Multer.File
  ): Promise<{
    fileName: string;
    filePath: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }> {
    try {
      console.log(`📤 [UploadService] Processando logo da escola ${EscolaGUID}`);

      // 1. Verificar se escola existe
      const escola = await this.#escolaDAO.findById(EscolaGUID);

      if (!escola) {
        // Se escola não existe, remover arquivo enviado
        this.deleteFile(file.path);
        throw new ErrorResponse(404, 'Escola não encontrada', {
          message: `Escola com GUID ${EscolaGUID} não existe`,
        });
      }

      // 2. Se escola já tem logo, remover arquivo antigo
      if (escola.EscolaLogo) {
        const oldLogoPath = path.resolve(process.cwd(), 'uploads', 'logos', escola.EscolaLogo);
        this.deleteFile(oldLogoPath);
      }

      // 3. Atualizar registro no banco com nome do arquivo
      escola.EscolaLogo = file.filename;
      const updated = await this.#escolaDAO.update(escola);

      if (!updated) {
        // Se falhou ao atualizar, remover arquivo
        this.deleteFile(file.path);
        throw new ErrorResponse(500, 'Erro ao atualizar escola', {
          message: 'Não foi possível salvar o logo da escola',
        });
      }

      console.log(`✅ [UploadService] Logo salvo com sucesso: ${file.filename}`);

      // 4. Retornar informações do arquivo
      return {
        fileName: file.filename,
        filePath: file.path,
        fileUrl: `/uploads/logos/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      };
    } catch (error: any) {
      // Em caso de erro, garantir que o arquivo é removido
      if (file && file.path) {
        this.deleteFile(file.path);
      }

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
    try {
      console.log(`🗑️  [UploadService] Removendo logo da escola ${EscolaGUID}`);

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

      // 2. Remover arquivo do disco
      const logoPath = path.resolve(process.cwd(), 'uploads', 'logos', escola.EscolaLogo);
      this.deleteFile(logoPath);

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

  /**
   * Helper para deletar arquivo
   */
  private deleteFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️  Arquivo removido: ${filePath}`);
      }
    } catch (error: any) {
      console.warn(`⚠️  Não foi possível remover arquivo ${filePath}:`, error.message);
    }
  }
}
