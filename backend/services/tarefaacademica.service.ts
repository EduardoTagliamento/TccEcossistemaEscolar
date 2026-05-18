import { v4 as uuidv4 } from "uuid";
import TarefaAcademica from "../entities/tarefaacademica.model";
import { TarefaAcademicaDAO, TarefaAcademicaFilters } from "../repositories/tarefaacademica.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import ErrorResponse from "../utils/ErrorResponse";

export interface TarefaAcademicaDTO {
  TarefaGUID: string;
  MatriculaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPostagemData: string;
  TarefaPrazoData: string;
  TarefaTipoEntrega: "digital" | "fisica";
  TarefaFeito: boolean;
  TarefaRealizacaoData: string | null;
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface TarefaAcademicaCreateDTO {
  MatriculaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo?: string;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: "digital" | "fisica";
  anexosDescricao?: string[]; // GUIDs de anexos já enviados para descrição
}

export interface TarefaAcademicaBatchCreateDTO {
  MatriculasGUID: string[]; // Array de GUIDs de matrículas
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo?: string;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: "digital" | "fisica";
  anexosDescricao?: string[];
}

export interface TarefaAcademicaUpdateDTO {
  TarefaTitulo?: string;
  TarefaConteudo?: string;
  TarefaPrazoData?: Date;
  TarefaTipoEntrega?: "digital" | "fisica";
  TarefaFeito?: boolean;
}

/**
 * Service para lógica de negócio de TarefaAcademica
 *
 * Regras principais:
 * - Professor cria/edita/exclui tarefas (via matXprofXturxescGUID)
 * - Aluno pode marcar tarefa como feita e enviar anexo de entrega
 * - Prazo não pode ser no passado ao criar/atualizar
 * - Entrega digital: aceita anexos de entrega
 * - Entrega física: não aceita anexos de entrega
 */
export default class TarefaAcademicaService {
  #tarefaDAO: TarefaAcademicaDAO;
  #anexoDAO: AnexoDAO;
  #matriculaDAO: MatriculaDAO;

  constructor(
    tarefaDAODependency: TarefaAcademicaDAO,
    anexoDAODependency: AnexoDAO,
    matriculaDAODependency: MatriculaDAO
  ) {
    console.log("⬆️  TarefaAcademicaService.constructor()");
    this.#tarefaDAO = tarefaDAODependency;
    this.#anexoDAO = anexoDAODependency;
    this.#matriculaDAO = matriculaDAODependency;
  }

  criarTarefa = async (
    data: TarefaAcademicaCreateDTO,
    usuarioCPF?: string
  ): Promise<TarefaAcademicaDTO> => {
    console.log("🟣 TarefaAcademicaService.criarTarefa()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para criar uma tarefa.",
      });
    }

    // Validar matrícula existe
    const matricula = await this.#matriculaDAO.findById(data.MatriculaGUID);
    if (!matricula) {
      throw new ErrorResponse(404, "Matrícula não encontrada", {
        message: `Não existe matrícula com id ${data.MatriculaGUID}`,
      });
    }

    // Validar prazo (não pode ser no passado)
    const prazo = new Date(data.TarefaPrazoData);
    if (isNaN(prazo.getTime()) || prazo < new Date()) {
      throw new ErrorResponse(400, "Prazo inválido", {
        message: "O prazo da tarefa não pode ser no passado.",
      });
    }

    // Criar tarefa
    const tarefa = new TarefaAcademica();
    tarefa.TarefaGUID = uuidv4();
    tarefa.MatriculaGUID = data.MatriculaGUID;
    tarefa.matXprofXturxescGUID = data.matXprofXturxescGUID;
    tarefa.TarefaTitulo = data.TarefaTitulo.trim();
    tarefa.TarefaConteudo = data.TarefaConteudo ? data.TarefaConteudo.trim() : null;
    tarefa.TarefaPostagemData = new Date();
    tarefa.TarefaPrazoData = prazo;
    tarefa.TarefaTipoEntrega = data.TarefaTipoEntrega;
    tarefa.TarefaFeito = false;

    const tarefaCriada = await this.#tarefaDAO.create(tarefa);

    // Vincular anexos de descrição (se houver)
    if (data.anexosDescricao && data.anexosDescricao.length > 0) {
      for (const anexoGUID of data.anexosDescricao) {
        const anexo = await this.#anexoDAO.findById(anexoGUID);
        if (anexo) {
          await this.#tarefaDAO.vincularAnexo(tarefaCriada.TarefaGUID, anexoGUID, "descricao");
        }
      }
    }

    return this.toDTO(tarefaCriada);
  };

  /**
   * Criar múltiplas tarefas de uma vez (batch)
   * Otimização de performance para criação de tarefas para vários alunos
   */
  criarTarefasBatch = async (
    data: TarefaAcademicaBatchCreateDTO,
    usuarioCPF?: string
  ): Promise<TarefaAcademicaDTO[]> => {
    console.log(`🟣 TarefaAcademicaService.criarTarefasBatch() - ${data.MatriculasGUID.length} tarefas`);

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para criar tarefas.",
      });
    }

    if (!data.MatriculasGUID || data.MatriculasGUID.length === 0) {
      throw new ErrorResponse(400, "Nenhuma matrícula fornecida", {
        message: "É necessário fornecer ao menos uma matrícula.",
      });
    }

    // Validar prazo (não pode ser no passado)
    const prazo = new Date(data.TarefaPrazoData);
    if (isNaN(prazo.getTime()) || prazo < new Date()) {
      throw new ErrorResponse(400, "Prazo inválido", {
        message: "O prazo da tarefa não pode ser no passado.",
      });
    }

    // Validar que todas as matrículas existem
    const matriculasExistentes = await Promise.all(
      data.MatriculasGUID.map((guid) => this.#matriculaDAO.findById(guid))
    );

    const matriculasInvalidas = data.MatriculasGUID.filter(
      (guid, index) => !matriculasExistentes[index]
    );

    if (matriculasInvalidas.length > 0) {
      throw new ErrorResponse(404, "Matrículas não encontradas", {
        message: `As seguintes matrículas não existem: ${matriculasInvalidas.join(", ")}`,
      });
    }

    // Criar objetos TarefaAcademica para cada matrícula
    const dataPostagemAtual = new Date();
    const tarefas: TarefaAcademica[] = data.MatriculasGUID.map((matriculaGUID) => {
      const tarefa = new TarefaAcademica();
      tarefa.TarefaGUID = uuidv4();
      tarefa.MatriculaGUID = matriculaGUID;
      tarefa.matXprofXturxescGUID = data.matXprofXturxescGUID;
      tarefa.TarefaTitulo = data.TarefaTitulo.trim();
      tarefa.TarefaConteudo = data.TarefaConteudo ? data.TarefaConteudo.trim() : null;
      tarefa.TarefaPostagemData = dataPostagemAtual;
      tarefa.TarefaPrazoData = prazo;
      tarefa.TarefaTipoEntrega = data.TarefaTipoEntrega;
      tarefa.TarefaFeito = false;
      return tarefa;
    });

    // Criar todas as tarefas em uma única query
    const tarefasCriadas = await this.#tarefaDAO.createBatch(tarefas);

    // Vincular anexos de descrição (se houver)
    if (data.anexosDescricao && data.anexosDescricao.length > 0) {
      for (const tarefaCriada of tarefasCriadas) {
        for (const anexoGUID of data.anexosDescricao) {
          const anexo = await this.#anexoDAO.findById(anexoGUID);
          if (anexo) {
            await this.#tarefaDAO.vincularAnexo(tarefaCriada.TarefaGUID, anexoGUID, "descricao");
          }
        }
      }
    }

    return tarefasCriadas.map((tarefa) => this.toDTO(tarefa));
  };

  listarTarefas = async (filters?: TarefaAcademicaFilters): Promise<TarefaAcademicaDTO[]> => {
    console.log("🟣 TarefaAcademicaService.listarTarefas()");

    const tarefas = await this.#tarefaDAO.findAll(filters);
    return tarefas.map((tarefa) => this.toDTO(tarefa));
  };

  buscarTarefa = async (TarefaGUID: string): Promise<TarefaAcademicaDTO> => {
    console.log("🟣 TarefaAcademicaService.buscarTarefa()");

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);

    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }

    return this.toDTO(tarefa);
  };

  atualizarTarefa = async (
    TarefaGUID: string,
    data: TarefaAcademicaUpdateDTO,
    usuarioCPF?: string
  ): Promise<TarefaAcademicaDTO> => {
    console.log("🟣 TarefaAcademicaService.atualizarTarefa()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para atualizar uma tarefa.",
      });
    }

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }

    // Validar prazo se fornecido
    if (data.TarefaPrazoData !== undefined) {
      const prazo = new Date(data.TarefaPrazoData);
      if (isNaN(prazo.getTime()) || prazo < new Date()) {
        throw new ErrorResponse(400, "Prazo inválido", {
          message: "O novo prazo da tarefa não pode ser no passado.",
        });
      }
      data.TarefaPrazoData = prazo;
    }

    const updates: Partial<Pick<
      TarefaAcademica,
      "TarefaTitulo" | "TarefaConteudo" | "TarefaPrazoData" | "TarefaTipoEntrega" | "TarefaFeito"
    >> = {};

    if (data.TarefaTitulo !== undefined) updates.TarefaTitulo = data.TarefaTitulo.trim();
    if (data.TarefaConteudo !== undefined) updates.TarefaConteudo = data.TarefaConteudo?.trim() ?? null;
    if (data.TarefaPrazoData !== undefined) updates.TarefaPrazoData = new Date(data.TarefaPrazoData);
    if (data.TarefaTipoEntrega !== undefined) updates.TarefaTipoEntrega = data.TarefaTipoEntrega;
    if (data.TarefaFeito !== undefined) updates.TarefaFeito = data.TarefaFeito;

    const tarefaAtualizada = await this.#tarefaDAO.update(TarefaGUID, updates);

    if (!tarefaAtualizada) {
      throw new ErrorResponse(404, "Tarefa não encontrada após atualização", {
        message: `Não foi possível buscar a tarefa ${TarefaGUID} após atualização.`,
      });
    }

    return this.toDTO(tarefaAtualizada);
  };

  excluirTarefa = async (TarefaGUID: string, usuarioCPF?: string): Promise<boolean> => {
    console.log("🟣 TarefaAcademicaService.excluirTarefa()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para excluir uma tarefa.",
      });
    }

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }

    return await this.#tarefaDAO.delete(TarefaGUID);
  };

  enviarAnexoEntrega = async (
    TarefaGUID: string,
    AnexoGUID: string,
    usuarioCPF?: string
  ): Promise<void> => {
    console.log("🟣 TarefaAcademicaService.enviarAnexoEntrega()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para enviar anexo de entrega.",
      });
    }

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }

    // Validar tipo de entrega
    if (tarefa.TarefaTipoEntrega !== "digital") {
      throw new ErrorResponse(400, "Tipo de entrega inválido", {
        message: "Esta tarefa não aceita entrega digital.",
      });
    }

    // Validar que anexo existe
    const anexo = await this.#anexoDAO.findById(AnexoGUID);
    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com id ${AnexoGUID}`,
      });
    }

    await this.#tarefaDAO.vincularAnexo(TarefaGUID, AnexoGUID, "entrega");
  };

  removerAnexo = async (
    TarefaGUID: string,
    AnexoGUID: string,
    usuarioCPF?: string
  ): Promise<void> => {
    console.log("🟣 TarefaAcademicaService.removerAnexo()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para remover anexo.",
      });
    }

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }

    await this.#tarefaDAO.desvincularAnexo(TarefaGUID, AnexoGUID);
  };

  // ========== Métodos Auxiliares ==========

  /**
   * Converte TarefaAcademica (classe) para TarefaAcademicaDTO (interface JSON)
   */
  private toDTO(tarefa: TarefaAcademica): TarefaAcademicaDTO {
    return {
      TarefaGUID: tarefa.TarefaGUID,
      MatriculaGUID: tarefa.MatriculaGUID,
      matXprofXturxescGUID: tarefa.matXprofXturxescGUID,
      TarefaTitulo: tarefa.TarefaTitulo,
      TarefaConteudo: tarefa.TarefaConteudo,
      TarefaPostagemData: tarefa.TarefaPostagemData.toISOString(),
      TarefaPrazoData: tarefa.TarefaPrazoData.toISOString(),
      TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
      TarefaFeito: tarefa.TarefaFeito,
      TarefaRealizacaoData: tarefa.TarefaRealizacaoData
        ? tarefa.TarefaRealizacaoData.toISOString()
        : null,
      CreatedAt: tarefa.CreatedAt ? tarefa.CreatedAt.toISOString() : null,
      UpdatedAt: tarefa.UpdatedAt ? tarefa.UpdatedAt.toISOString() : null,
    };
  }
}
