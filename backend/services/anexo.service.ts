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
  UsuarioGUID: string;
  EscolaGUID: string;
  AnexoCaminho: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: string | null; // ISO string
}

/** Filtros de listagem recebidos do cliente — `UsuarioCPF` é resolvido pra GUID dentro de `listarAnexos`. */
export interface AnexoListarFiltrosDTO {
  UsuarioCPF?: string;
  EscolaGUID?: string;
  DataInicio?: Date;
  DataFim?: Date;
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
    const anexo = new Anexo();
    anexo.AnexoGUID = anexoGUID;
    anexo.UsuarioGUID = usuarioGUID;
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

  /**
   * O cliente ainda filtra por CPF do dono do anexo (`?UsuarioCPF=`), então
   * resolvemos CPF -> GUID aqui antes de repassar pro repositório — `anexo`
   * já está migrado pra GUID.
   */
  listarAnexos = async (filters?: AnexoListarFiltrosDTO): Promise<AnexoDTO[]> => {
    console.log("🟣 AnexoService.listarAnexos()");

    const { UsuarioCPF, ...resto } = filters ?? {};
    const daoFilters: AnexoFilters = { ...resto };
    if (UsuarioCPF) {
      const usuario = await this.#usuarioDAO.findByCPF(UsuarioCPF);
      daoFilters.UsuarioGUID = usuario?.UsuarioGUID ?? "__cpf_nao_encontrado__";
    }

    const anexos = await this.#anexoDAO.findAll(daoFilters);
    return anexos.map((anexo) => this.toDTO(anexo));
  };

  // ========== Métodos Auxiliares ==========

  /**
   * Converte Anexo (classe) para AnexoDTO (interface JSON)
   */
  private toDTO(anexo: Anexo): AnexoDTO {
    return {
      AnexoGUID: anexo.AnexoGUID,
      UsuarioGUID: anexo.UsuarioGUID,
      EscolaGUID: anexo.EscolaGUID,
      AnexoCaminho: anexo.AnexoCaminho,
      AnexoNomeOriginal: anexo.AnexoNomeOriginal,
      AnexoTamanho: anexo.AnexoTamanho,
      CreatedAt: anexo.CreatedAt ? anexo.CreatedAt.toISOString() : null,
    };
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

    if (anexo.UsuarioGUID === usuarioGUID) {
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
    // Permitir se for o dono do arquivo
    if (anexo.UsuarioGUID === usuarioGUID) {
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
