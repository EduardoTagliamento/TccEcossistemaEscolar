/**
 * 📤 Serviço de Upload
 *
 * Gerencia upload de arquivos e atualização de registros no banco.
 * Os arquivos em si vão para o Cloudflare R2 (ver R2StorageService) — o
 * campo EscolaLogo guarda a URL pública completa do arquivo no bucket.
 */

import { EscolaDAO } from '../repositories/escola.repository';
import { UsuarioDAO } from '../repositories/usuario.repository';
import ErrorResponse from '../utils/ErrorResponse';
import R2StorageService from './r2storage.service';

export default class UploadService {
  #escolaDAO: EscolaDAO;
  #usuarioDAO?: UsuarioDAO;

  constructor(escolaDAO: EscolaDAO, usuarioDAO?: UsuarioDAO) {
    console.log('⬆️  UploadService.constructor()');
    this.#escolaDAO = escolaDAO;
    this.#usuarioDAO = usuarioDAO;
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
   * Processa upload de anexo de mensagem (Chat / módulo Conversa).
   * Diferente do logo, não atualiza nenhum registro no banco — a criação da
   * `Mensagem` em si acontece via WebSocket (`send_mensagem`), depois que o
   * cliente já tem a URL retornada aqui. Ver `MensagemService.enviar()`.
   */
  async uploadMensagemAnexo(
    ConversaGUID: string,
    file: Express.Multer.File
  ): Promise<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    mensagemTipo: 'Imagem' | 'Arquivo';
  }> {
    console.log(`📤 [UploadService] Processando anexo de mensagem da conversa ${ConversaGUID}`);

    try {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const originalName = file.originalname.replace(/\s+/g, '-').toLowerCase();
      const fileName = `${timestamp}-${randomString}-${originalName}`;
      const chave = `mensagens/${ConversaGUID}/${fileName}`;

      const fileUrl = await R2StorageService.upload(
        chave,
        file.buffer,
        file.mimetype,
        `inline; filename="${originalName}"`
      );

      const mensagemTipo: 'Imagem' | 'Arquivo' = file.mimetype.startsWith('image/') ? 'Imagem' : 'Arquivo';

      console.log(`✅ [UploadService] Anexo de mensagem salvo com sucesso: ${fileUrl}`);

      return {
        fileName: originalName,
        fileUrl,
        fileSize: file.size,
        mimeType: file.mimetype,
        mensagemTipo,
      };
    } catch (error: any) {
      if (error instanceof ErrorResponse) {
        throw error;
      }

      console.error('❌ [UploadService] Erro ao processar anexo de mensagem:', error);
      throw new ErrorResponse(500, 'Erro ao processar upload', {
        message: 'Falha ao salvar anexo',
      });
    }
  }

  /**
   * Processa upload de foto de perfil de usuário (painel "Configuração do
   * usuário" — dropdown do avatar no dashboard). Mesmo padrão/limites do
   * logo de escola (1MB, PNG/JPG/JPEG via `uploadMiddleware`).
   */
  async uploadFotoUsuario(
    UsuarioCPF: string,
    file: Express.Multer.File
  ): Promise<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }> {
    console.log(`📤 [UploadService] Processando foto do usuário ${UsuarioCPF}`);

    if (!this.#usuarioDAO) {
      throw new ErrorResponse(500, 'Upload de foto de usuário não configurado');
    }

    const usuario = await this.#usuarioDAO.findById(UsuarioCPF);
    if (!usuario) {
      throw new ErrorResponse(404, 'Usuário não encontrado', {
        message: `Usuário com CPF ${UsuarioCPF} não existe`,
      });
    }

    try {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 8);
      const originalName = file.originalname.replace(/\s+/g, '-').toLowerCase();
      const fileName = `${timestamp}-${randomString}-${originalName}`;
      const chave = `fotos-usuario/${UsuarioCPF}/${fileName}`;

      const fileUrl = await R2StorageService.upload(chave, file.buffer, file.mimetype);

      if (usuario.UsuarioFotoUrl) {
        R2StorageService.removeByUrl(usuario.UsuarioFotoUrl).catch((error) => {
          console.warn('⚠️  [UploadService] Falha ao remover foto antiga do R2:', error.message);
        });
      }

      usuario.UsuarioFotoUrl = fileUrl;
      const updated = await this.#usuarioDAO.update(usuario);
      if (!updated) {
        throw new ErrorResponse(500, 'Erro ao atualizar usuário', {
          message: 'Não foi possível salvar a foto do usuário',
        });
      }

      console.log(`✅ [UploadService] Foto de usuário salva com sucesso: ${fileUrl}`);

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

      console.error('❌ [UploadService] Erro ao processar foto de usuário:', error);
      throw new ErrorResponse(500, 'Erro ao processar upload', {
        message: 'Falha ao salvar arquivo',
      });
    }
  }

  /**
   * Remove foto de perfil de usuário
   */
  async removeFotoUsuario(UsuarioCPF: string): Promise<boolean> {
    console.log(`🗑️  [UploadService] Removendo foto do usuário ${UsuarioCPF}`);

    if (!this.#usuarioDAO) {
      throw new ErrorResponse(500, 'Upload de foto de usuário não configurado');
    }

    const usuario = await this.#usuarioDAO.findById(UsuarioCPF);
    if (!usuario) {
      throw new ErrorResponse(404, 'Usuário não encontrado', {
        message: `Usuário com CPF ${UsuarioCPF} não existe`,
      });
    }

    if (!usuario.UsuarioFotoUrl) {
      throw new ErrorResponse(400, 'Usuário não possui foto', {
        message: 'Não há foto para remover',
      });
    }

    await R2StorageService.removeByUrl(usuario.UsuarioFotoUrl);

    usuario.UsuarioFotoUrl = null;
    const updated = await this.#usuarioDAO.update(usuario);

    console.log('✅ [UploadService] Foto de usuário removida com sucesso');
    return updated;
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
