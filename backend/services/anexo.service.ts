import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import ErrorResponse from "../utils/ErrorResponse";
import Anexo from "../entities/anexo.model";
import { AnexoDAO, AnexoFilters } from "../repositories/anexo.repository";
import { EscolaDAO } from "../repositories/escola.repository";

export interface AnexoDTO {
  AnexoGUID: string;
  UsuarioCPF: string;
  EscolaGUID: string;
  AnexoCaminho: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: string | null; // ISO string
}

export default class AnexoService {
  #anexoDAO: AnexoDAO;
  #escolaDAO: EscolaDAO;

  constructor(anexoDAODependency: AnexoDAO, escolaDAODependency: EscolaDAO) {
    console.log("⬆️  AnexoService.constructor()");
    this.#anexoDAO = anexoDAODependency;
    this.#escolaDAO = escolaDAODependency;
  }

  uploadAnexo = async (
    file: Express.Multer.File,
    EscolaGUID: string,
    usuarioCPF?: string
  ): Promise<AnexoDTO> => {
    console.log("🟣 AnexoService.uploadAnexo()");

    if (!usuarioCPF) {
      // Deletar arquivo físico se validação falhar
      this.deletePhysicalFile(file.path);
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para fazer upload de anexo.",
      });
    }

    // Validar se escola existe
    const escola = await this.#escolaDAO.findById(EscolaGUID);
    if (!escola) {
      // Deletar arquivo físico se escola não existir
      this.deletePhysicalFile(file.path);
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${EscolaGUID}`,
      });
    }

    // Criar registro do anexo
    const anexo = new Anexo();
    anexo.AnexoGUID = uuidv4();
    anexo.UsuarioCPF = this.normalizeCPF(usuarioCPF);
    anexo.EscolaGUID = EscolaGUID;
    anexo.AnexoCaminho = `/uploads/anexos/${path.basename(file.path)}`;
    anexo.AnexoNomeOriginal = file.originalname;
    anexo.AnexoTamanho = file.size;

    await this.#anexoDAO.create(anexo);

    return this.toDTO(anexo);
  };

  buscarAnexo = async (AnexoGUID: string): Promise<AnexoDTO> => {
    console.log("🟣 AnexoService.buscarAnexo()");

    const anexo = await this.#anexoDAO.findById(AnexoGUID);

    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com id ${AnexoGUID}`,
      });
    }

    // TODO: Validar permissão de leitura
    // await this.validarPermissaoLeitura(usuarioCPF, anexo);

    return this.toDTO(anexo);
  };

  downloadAnexo = async (AnexoGUID: string): Promise<{ caminho: string; nomeOriginal: string }> => {
    console.log("🟣 AnexoService.downloadAnexo()");

    const anexo = await this.#anexoDAO.findById(AnexoGUID);

    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com id ${AnexoGUID}`,
      });
    }

    // TODO: Validar permissão de leitura
    // await this.validarPermissaoLeitura(usuarioCPF, anexo);

    // Validar se arquivo físico existe
    const caminhoCompleto = path.resolve(process.cwd(), anexo.AnexoCaminho.substring(1));
    if (!fs.existsSync(caminhoCompleto)) {
      throw new ErrorResponse(404, "Arquivo físico não encontrado", {
        message: `O arquivo ${anexo.AnexoNomeOriginal} não está mais disponível no servidor.`,
      });
    }

    return {
      caminho: caminhoCompleto,
      nomeOriginal: anexo.AnexoNomeOriginal || "arquivo",
    };
  };

  excluirAnexo = async (AnexoGUID: string, usuarioCPF?: string): Promise<boolean> => {
    console.log("🟣 AnexoService.excluirAnexo()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para excluir anexo.",
      });
    }

    const anexo = await this.#anexoDAO.findById(AnexoGUID);

    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com id ${AnexoGUID}`,
      });
    }

    // Validar permissão: apenas o dono ou admin pode deletar
    await this.validarPermissaoEscrita(usuarioCPF, anexo);

    // Deletar registro do banco
    const deletado = await this.#anexoDAO.delete(AnexoGUID);

    if (deletado) {
      // Deletar arquivo físico
      const caminhoCompleto = path.resolve(process.cwd(), anexo.AnexoCaminho.substring(1));
      this.deletePhysicalFile(caminhoCompleto);
    }

    return deletado;
  };

  listarAnexos = async (filters?: AnexoFilters): Promise<AnexoDTO[]> => {
    console.log("🟣 AnexoService.listarAnexos()");

    const anexos = await this.#anexoDAO.findAll(filters);
    return anexos.map((anexo) => this.toDTO(anexo));
  };

  // ========== Métodos Auxiliares ==========

  /**
   * Converte Anexo (classe) para AnexoDTO (interface JSON)
   */
  private toDTO(anexo: Anexo): AnexoDTO {
    return {
      AnexoGUID: anexo.AnexoGUID,
      UsuarioCPF: anexo.UsuarioCPF,
      EscolaGUID: anexo.EscolaGUID,
      AnexoCaminho: anexo.AnexoCaminho,
      AnexoNomeOriginal: anexo.AnexoNomeOriginal,
      AnexoTamanho: anexo.AnexoTamanho,
      CreatedAt: anexo.CreatedAt ? anexo.CreatedAt.toISOString() : null,
    };
  }

  /**
   * Normaliza CPF para formato XXX.XXX.XXX-XX
   */
  private normalizeCPF(cpf: string): string {
    const normalized = cpf.trim();
    if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(normalized)) {
      return normalized;
    }

    const digits = normalized.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
    }

    return normalized;
  }

  /**
   * Deleta arquivo físico do sistema de arquivos
   */
  private deletePhysicalFile(caminho: string): void {
    try {
      if (fs.existsSync(caminho)) {
        fs.unlinkSync(caminho);
        console.log(`📁 Arquivo deletado: ${caminho}`);
      }
    } catch (error) {
      console.error(`❌ Erro ao deletar arquivo: ${caminho}`, error);
    }
  }

  /**
   * Valida se usuário pode ler o anexo
   * TODO: Implementar validação real consultando escolaxusuarioxfuncao
   */
  private async validarPermissaoLeitura(usuarioCPF: string, anexo: Anexo): Promise<void> {
    // Implementar validação de permissão
    // Consultar se usuário pertence à escola do anexo
    // throw new ErrorResponse(403, "Sem permissão para acessar este anexo");
  }

  /**
   * Valida se usuário pode escrever/deletar o anexo
   * Apenas dono do arquivo OU admin da escola podem deletar
   */
  private async validarPermissaoEscrita(usuarioCPF: string, anexo: Anexo): Promise<void> {
    const cpfNormalizado = this.normalizeCPF(usuarioCPF);

    // Permitir se for o dono do arquivo
    if (anexo.UsuarioCPF === cpfNormalizado) {
      return;
    }

    // TODO: Verificar se usuário é admin da escola (FuncaoId 6)
    // const vinculo = await escolaxusuarioxfuncaoDAO.findByTripla(cpfNormalizado, anexo.EscolaGUID, 6);
    // if (vinculo) return;

    throw new ErrorResponse(403, "Sem permissão para excluir este anexo", {
      message: "Apenas o dono do arquivo ou administrador da escola podem excluir este anexo.",
    });
  }
}
