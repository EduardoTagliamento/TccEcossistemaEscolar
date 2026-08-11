import { gerarGUID } from "../utils/helpers/guid.helper";
import path from "path";
import ErrorResponse from "../utils/ErrorResponse";
import Anexo from "../entities/anexo.model";
import { AnexoDAO, AnexoFilters } from "../repositories/anexo.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import R2StorageService from "./r2storage.service";

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
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;
  #usuarioDAO: UsuarioDAO;

  constructor(
    anexoDAODependency: AnexoDAO,
    escolaDAODependency: EscolaDAO,
    escolaxUsuarioxFuncaoDAODependency: EscolaxUsuarioxFuncaoDAO,
    usuarioDAODependency: UsuarioDAO
  ) {
    console.log("⬆️  AnexoService.constructor()");
    this.#anexoDAO = anexoDAODependency;
    this.#escolaDAO = escolaDAODependency;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAODependency;
    this.#usuarioDAO = usuarioDAODependency;
  }

  #resolverCPFAtor = async (usuarioGUID: string): Promise<string> => {
    const usuario = await this.#usuarioDAO.findByGUID(usuarioGUID);
    if (!usuario?.UsuarioCPF) {
      throw new ErrorResponse(403, "Usuário sem CPF cadastrado");
    }
    return usuario.UsuarioCPF;
  };

  uploadAnexo = async (
    file: Express.Multer.File,
    EscolaGUID: string,
    usuarioGUID?: string
  ): Promise<AnexoDTO> => {
    console.log("🟣 AnexoService.uploadAnexo()");

    if (!usuarioGUID) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para fazer upload de anexo.",
      });
    }

    // Validar se escola existe
    const escola = await this.#escolaDAO.findById(EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${EscolaGUID}`,
      });
    }

    // Enviar arquivo para o R2
    const anexoGUID = gerarGUID();
    const ext = path.extname(file.originalname);
    const chave = `anexos/${EscolaGUID}/${anexoGUID}${ext}`;
    const contentDisposition = `attachment; filename="${encodeURIComponent(file.originalname)}"`;

    const fileUrl = await R2StorageService.upload(chave, file.buffer, file.mimetype, contentDisposition);

    // Criar registro do anexo
    const usuarioCPF = await this.#resolverCPFAtor(usuarioGUID);
    const anexo = new Anexo();
    anexo.AnexoGUID = anexoGUID;
    anexo.UsuarioCPF = this.normalizeCPF(usuarioCPF);
    anexo.EscolaGUID = EscolaGUID;
    anexo.AnexoCaminho = fileUrl;
    anexo.AnexoNomeOriginal = file.originalname;
    anexo.AnexoTamanho = file.size;

    await this.#anexoDAO.create(anexo);

    return this.toDTO(anexo);
  };

  buscarAnexo = async (AnexoGUID: string, usuarioGUID?: string): Promise<AnexoDTO> => {
    console.log("🟣 AnexoService.buscarAnexo()");

    const anexo = await this.#anexoDAO.findById(AnexoGUID);

    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com id ${AnexoGUID}`,
      });
    }

    await this.validarPermissaoLeitura(usuarioGUID, anexo);

    return this.toDTO(anexo);
  };

  downloadAnexo = async (
    AnexoGUID: string,
    usuarioGUID?: string
  ): Promise<{ caminho: string; nomeOriginal: string }> => {
    console.log("🟣 AnexoService.downloadAnexo()");

    const anexo = await this.#anexoDAO.findById(AnexoGUID);

    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com id ${AnexoGUID}`,
      });
    }

    await this.validarPermissaoLeitura(usuarioGUID, anexo);

    // AnexoCaminho já é a URL pública completa no R2 (o objeto foi
    // enviado com ContentDisposition "attachment", então o navegador
    // baixa com o nome original mesmo sem passar pelo nosso servidor).
    return {
      caminho: anexo.AnexoCaminho,
      nomeOriginal: anexo.AnexoNomeOriginal || "arquivo",
    };
  };

  excluirAnexo = async (AnexoGUID: string, usuarioGUID?: string): Promise<boolean> => {
    console.log("🟣 AnexoService.excluirAnexo()");

    if (!usuarioGUID) {
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
    await this.validarPermissaoEscrita(usuarioGUID, anexo);

    // Deletar registro do banco
    const deletado = await this.#anexoDAO.delete(AnexoGUID);

    if (deletado) {
      // Deletar arquivo do R2 (não bloqueia a resposta se falhar)
      R2StorageService.removeByUrl(anexo.AnexoCaminho).catch((error) => {
        console.warn(`⚠️  Não foi possível remover anexo do R2: ${anexo.AnexoCaminho}`, error.message);
      });
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
   * Valida se usuário pode ler o anexo: precisa ter algum vínculo ativo
   * com a escola dona do anexo (qualquer função) — sem isso, qualquer
   * usuário autenticado de qualquer escola conseguia ler/baixar anexo de
   * outra escola só sabendo o GUID.
   */
  private async validarPermissaoLeitura(usuarioGUID: string | undefined, anexo: Anexo): Promise<void> {
    if (!usuarioGUID) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para acessar este anexo.",
      });
    }

    const cpfNormalizado = this.normalizeCPF(await this.#resolverCPFAtor(usuarioGUID));

    if (anexo.UsuarioCPF === cpfNormalizado) {
      return;
    }

    const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      UsuarioGUID: usuarioGUID,
      EscolaGUID: anexo.EscolaGUID,
    });

    if (vinculos.length > 0) {
      return;
    }

    throw new ErrorResponse(403, "Sem permissão para acessar este anexo", {
      message: "Você não tem vínculo com a escola dona deste anexo.",
    });
  }

  /**
   * Valida se usuário pode escrever/deletar o anexo
   * Apenas dono do arquivo OU Coordenação/Direção da escola podem deletar
   */
  private async validarPermissaoEscrita(usuarioGUID: string, anexo: Anexo): Promise<void> {
    const cpfNormalizado = this.normalizeCPF(await this.#resolverCPFAtor(usuarioGUID));

    // Permitir se for o dono do arquivo
    if (anexo.UsuarioCPF === cpfNormalizado) {
      return;
    }

    const ehCoordOuDirecao = await this.#escolaxUsuarioxFuncaoDAO.isCoordOuDirecaoEmEscola(
      usuarioGUID,
      anexo.EscolaGUID
    );
    if (ehCoordOuDirecao) {
      return;
    }

    throw new ErrorResponse(403, "Sem permissão para excluir este anexo", {
      message: "Apenas o dono do arquivo ou administrador da escola podem excluir este anexo.",
    });
  }
}
