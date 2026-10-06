import { gerarGUID } from "../utils/helpers/guid.helper";
import path from "path";
import sharp from "sharp";
import ErrorResponse from "../utils/ErrorResponse";
import Anexo from "../entities/anexo.model";
import { AnexoDAO, AnexoFilters } from "../repositories/anexo.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import R2StorageService from "./r2storage.service";

export interface RecorteArea {
  left: number;
  top: number;
  width: number;
  height: number;
}

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

  /** Resolve `AnexoGUID` a partir da URL pública conhecida — ver `AnexoDAO.findByCaminho`. Só
   * confia em URL que já é um `AnexoCaminho` real já gravado no banco (nunca busca/faz fetch de
   * URL arbitrária vinda do cliente) — por isso é seguro reusar a mesma checagem de permissão de
   * leitura de `buscarAnexo`, não é um proxy de URL aberto. */
  buscarAnexoPorCaminho = async (caminho: string, usuarioGUID?: string): Promise<AnexoDTO> => {
    console.log("🟣 AnexoService.buscarAnexoPorCaminho()");

    const anexo = await this.#anexoDAO.findByCaminho(caminho);
    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com caminho ${caminho}`,
      });
    }

    await this.validarPermissaoLeitura(usuarioGUID, anexo);

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

  /**
   * Recorta um anexo de IMAGEM já existente e cria um anexo NOVO com o resultado (não
   * sobrescreve o original — mesmo padrão de "nunca editar em cima", igual o resto do sistema
   * trata arquivo). O recorte roda no SERVIDOR (sharp), não no navegador: imagem de outra origem
   * (R2) num `<canvas>` do browser esbarra em CORS pra exportar o resultado (`toBlob`/
   * `getImageData` ficam bloqueados, "tainted canvas") — baixar e cortar aqui no backend evita
   * depender de header de CORS que o bucket pode não mandar. Pedido do Eduardo, 2026-10-05, tela
   * de validação de questões em admin-plataforma.
   */
  recortarAnexo = async (AnexoGUID: string, area: RecorteArea, usuarioGUID?: string): Promise<AnexoDTO> => {
    console.log("🟣 AnexoService.recortarAnexo()");

    if (!usuarioGUID) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para recortar um anexo.",
      });
    }

    const { left, top, width, height } = area;
    if (![left, top, width, height].every((v) => Number.isFinite(v) && v >= 0) || width < 1 || height < 1) {
      throw new ErrorResponse(400, "Área de recorte inválida", {
        message: "left/top/width/height devem ser números não-negativos, width/height maiores que 0.",
      });
    }

    const anexo = await this.#anexoDAO.findById(AnexoGUID);
    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com id ${AnexoGUID}`,
      });
    }
    await this.validarPermissaoLeitura(usuarioGUID, anexo);

    const resposta = await fetch(anexo.AnexoCaminho);
    if (!resposta.ok) {
      throw new ErrorResponse(502, "Falha ao buscar a imagem original no armazenamento", {
        message: `R2 devolveu status ${resposta.status} pra ${anexo.AnexoCaminho}`,
      });
    }
    const bufferOriginal = Buffer.from(await resposta.arrayBuffer());

    let bufferRecortado: Buffer;
    try {
      bufferRecortado = await sharp(bufferOriginal)
        .extract({
          left: Math.round(left),
          top: Math.round(top),
          width: Math.round(width),
          height: Math.round(height),
        })
        .jpeg({ quality: 92 })
        .toBuffer();
    } catch (erro: any) {
      throw new ErrorResponse(400, "Falha ao recortar a imagem", {
        message: erro.message || "A área de recorte pode estar fora dos limites da imagem.",
      });
    }

    const novoGUID = gerarGUID();
    const chave = `anexos/${anexo.EscolaGUID}/${novoGUID}.jpg`;
    const nomeOriginal = `recorte-${anexo.AnexoNomeOriginal || "imagem.jpg"}`;
    const fileUrl = await R2StorageService.upload(
      chave,
      bufferRecortado,
      "image/jpeg",
      `attachment; filename="${encodeURIComponent(nomeOriginal)}"`
    );

    const novoAnexo = new Anexo();
    novoAnexo.AnexoGUID = novoGUID;
    novoAnexo.UsuarioGUID = usuarioGUID;
    novoAnexo.EscolaGUID = anexo.EscolaGUID;
    novoAnexo.AnexoCaminho = fileUrl;
    novoAnexo.AnexoNomeOriginal = nomeOriginal;
    novoAnexo.AnexoTamanho = bufferRecortado.length;
    await this.#anexoDAO.create(novoAnexo);

    return this.toDTO(novoAnexo);
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
