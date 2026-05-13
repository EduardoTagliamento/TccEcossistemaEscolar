import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse";
import Materia from "../entities/materia.model";
import { MateriaDAO, MateriaFilters } from "../repositories/materia.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";

export interface MateriaDTO {
  MateriaGUID: string;
  EscolaGUID: string;
  MateriaNome: string;
  MateriaIsTecnico: boolean;
  MateriaStatus: "Ativa" | "Inativa";
  MateriaCreatedAt: string;
  MateriaUpdatedAt: string;
}

export interface MateriaCreateDTO {
  EscolaGUID: string;
  MateriaNome: string;
  MateriaIsTecnico: boolean;
  MateriaStatus?: "Ativa" | "Inativa";
}

export interface MateriaUpdateDTO {
  MateriaNome?: string;
  MateriaIsTecnico?: boolean;
  MateriaStatus?: "Ativa" | "Inativa";
}

export default class MateriaService {
  #materiaDAO: MateriaDAO;
  #escolaDAO: EscolaDAO;
  #escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    materiaDAO: MateriaDAO,
    escolaDAO: EscolaDAO,
    escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("⬆️  MateriaService.constructor()");
    this.#materiaDAO = materiaDAO;
    this.#escolaDAO = escolaDAO;
    this.#escolaxusuarioxfuncaoDAO = escolaxusuarioxfuncaoDAO;
  }

  criarMateria = async (
    data: MateriaCreateDTO,
    usuarioCPF: string
  ): Promise<MateriaDTO> => {
    console.log("🟣 MateriaService.criarMateria()");

    // 1. Validar existência da escola
    const escola = await this.#escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${data.EscolaGUID}`,
      });
    }

    // 2. Validar permissão (Coordenação ou Direção)
    await this.validarPermissaoEscrita(usuarioCPF, data.EscolaGUID);

    // 3. Validar se matéria técnica requer escola técnica
    if (data.MateriaIsTecnico && !escola.EscolaIsTecnica) {
      throw new ErrorResponse(400, "Matéria técnica só pode ser criada em escola técnica", {
        message:
          "Esta escola não está marcada como técnica. Para criar matérias técnicas, atualize a configuração da escola.",
      });
    }

    // 4. Validar duplicidade de nome
    const existente = await this.#materiaDAO.findByEscolaAndNome(
      data.EscolaGUID,
      data.MateriaNome.trim()
    );
    if (existente) {
      throw new ErrorResponse(409, "Já existe matéria com este nome nesta escola", {
        message: `A matéria "${data.MateriaNome}" já está cadastrada nesta escola`,
      });
    }

    // 5. Gerar GUID e criar
    const materia = new Materia();
    materia.MateriaGUID = uuidv4();
    materia.EscolaGUID = data.EscolaGUID;
    materia.MateriaNome = data.MateriaNome.trim();
    materia.MateriaIsTecnico = data.MateriaIsTecnico;
    materia.MateriaStatus = data.MateriaStatus || "Ativa";
    materia.MateriaCreatedAt = new Date();
    materia.MateriaUpdatedAt = new Date();

    await this.#materiaDAO.create(materia);

    return this.toDTO(materia);
  };

  listarMaterias = async (filters: MateriaFilters): Promise<MateriaDTO[]> => {
    console.log("🟣 MateriaService.listarMaterias()");

    const materias = await this.#materiaDAO.findAll(filters);
    return materias.map((materia) => this.toDTO(materia));
  };

  buscarMateria = async (guid: string): Promise<MateriaDTO> => {
    console.log("🟣 MateriaService.buscarMateria()");

    const materia = await this.#materiaDAO.findById(guid);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${guid}`,
      });
    }

    return this.toDTO(materia);
  };

  atualizarMateria = async (
    guid: string,
    data: MateriaUpdateDTO,
    usuarioCPF: string
  ): Promise<MateriaDTO> => {
    console.log("🟣 MateriaService.atualizarMateria()");

    // 1. Buscar matéria existente
    const materiaExistente = await this.#materiaDAO.findById(guid);
    if (!materiaExistente) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${guid}`,
      });
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, materiaExistente.EscolaGUID);

    // 3. Se mudou nome, validar duplicidade
    if (data.MateriaNome && data.MateriaNome !== materiaExistente.MateriaNome) {
      const existente = await this.#materiaDAO.findByEscolaAndNome(
        materiaExistente.EscolaGUID,
        data.MateriaNome.trim()
      );
      if (existente && existente.MateriaGUID !== guid) {
        throw new ErrorResponse(409, "Já existe matéria com este nome", {
          message: `A matéria "${data.MateriaNome}" já está cadastrada nesta escola`,
        });
      }
    }

    // 4. Se mudou para técnica, validar escola técnica
    if (data.MateriaIsTecnico !== undefined && data.MateriaIsTecnico) {
      const escola = await this.#escolaDAO.findById(materiaExistente.EscolaGUID);
      if (!escola?.EscolaIsTecnica) {
        throw new ErrorResponse(400, "Escola não é técnica", {
          message: "Esta escola não está marcada como técnica",
        });
      }
    }

    // 5. Preparar dados para atualização
    const materiaAtualizada = new Materia();
    materiaAtualizada.MateriaGUID = guid;
    materiaAtualizada.EscolaGUID = materiaExistente.EscolaGUID;
    materiaAtualizada.MateriaNome =
      data.MateriaNome !== undefined ? data.MateriaNome.trim() : materiaExistente.MateriaNome;
    materiaAtualizada.MateriaIsTecnico =
      data.MateriaIsTecnico !== undefined
        ? data.MateriaIsTecnico
        : materiaExistente.MateriaIsTecnico;
    materiaAtualizada.MateriaStatus =
      data.MateriaStatus !== undefined ? data.MateriaStatus : materiaExistente.MateriaStatus;

    // 6. Atualizar
    const resultado = await this.#materiaDAO.update(guid, materiaAtualizada);
    if (!resultado) {
      throw new ErrorResponse(500, "Erro ao atualizar matéria", {
        message: "Não foi possível atualizar a matéria",
      });
    }

    return this.toDTO(resultado);
  };

  excluirMateria = async (guid: string, usuarioCPF: string): Promise<boolean> => {
    console.log("🟣 MateriaService.excluirMateria()");

    // 1. Buscar matéria
    const materia = await this.#materiaDAO.findById(guid);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${guid}`,
      });
    }

    // 2. Validar permissão
    await this.validarPermissaoEscrita(usuarioCPF, materia.EscolaGUID);

    // 3. Soft delete
    return await this.#materiaDAO.delete(guid);
  };

  // Helper: validar permissão de escrita (Coordenação ou Direção)
  private validarPermissaoEscrita = async (
    cpf: string,
    escolaGUID: string
  ): Promise<void> => {
    console.log("🔒 MateriaService.validarPermissaoEscrita()");

    // Validar Coordenação (FuncaoId = 1)
    const coordenacao = await this.#escolaxusuarioxfuncaoDAO.findByTripla(
      cpf,
      escolaGUID,
      1
    );

    if (coordenacao && coordenacao.Status === "Ativo") {
      return; // Tem permissão
    }

    // Validar Direção (FuncaoId = 6)
    const direcao = await this.#escolaxusuarioxfuncaoDAO.findByTripla(
      cpf,
      escolaGUID,
      6
    );

    if (direcao && direcao.Status === "Ativo") {
      return; // Tem permissão
    }

    // Sem permissão
    throw new ErrorResponse(403, "Sem permissão", {
      message: "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar matérias.",
    });
  };

  private toDTO(materia: Materia): MateriaDTO {
    return {
      MateriaGUID: materia.MateriaGUID,
      EscolaGUID: materia.EscolaGUID,
      MateriaNome: materia.MateriaNome || "",
      MateriaIsTecnico: materia.MateriaIsTecnico,
      MateriaStatus: materia.MateriaStatus,
      MateriaCreatedAt: materia.MateriaCreatedAt
        ? materia.MateriaCreatedAt.toISOString()
        : new Date().toISOString(),
      MateriaUpdatedAt: materia.MateriaUpdatedAt
        ? materia.MateriaUpdatedAt.toISOString()
        : new Date().toISOString(),
    };
  }
}
