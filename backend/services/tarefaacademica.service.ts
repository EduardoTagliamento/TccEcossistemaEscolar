import { v4 as uuidv4 } from "uuid";
import TarefaAcademica from "../entities/tarefaacademica.model";
import TarefaAcademicaMatricula from "../entities/tarefaacademica-matricula.model";
import { TarefaAcademicaDAO, TarefaAcademicaFilters } from "../repositories/tarefaacademica.repository";
import { TarefaAcademicaMatriculaDAO } from "../repositories/tarefaacademica-matricula.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * DTOs - Estruturas normalizadas (1 tarefa → N alunos)
 */

export interface TarefaAcademicaDTO {
  TarefaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPostagemData: string;
  TarefaPrazoData: string;
  TarefaTipoEntrega: "digital" | "fisica";
  MatriculasAtribuidas: MatriculaAtribuidaDTO[]; // Alunos que receberam a tarefa
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface MatriculaAtribuidaDTO {
  TarefaMatriculaGUID: string;
  MatriculaGUID: string;
  TarefaFeito: boolean;
  TarefaRealizacaoData: string | null;
}

export interface TarefaAcademicaCreateDTO {
  MatriculasGUID: string[]; // Array de GUIDs (normalizado)
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo?: string;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: "digital" | "fisica";
  anexosDescricao?: string[]; // GUIDs de anexos já enviados para descrição
}

// Batch agora é o mesmo que Create (sempre atribui para N alunos)
export interface TarefaAcademicaBatchCreateDTO extends TarefaAcademicaCreateDTO {}

export interface TarefaAcademicaUpdateDTO {
  TarefaTitulo?: string;
  TarefaConteudo?: string;
  TarefaPrazoData?: Date;
  TarefaTipoEntrega?: "digital" | "fisica";
}

export interface TarefaAcademicaMarcarFeitoDTO {
  TarefaGUID: string;
  MatriculaGUID: string;
  TarefaFeito: boolean;
}

/**
 * Service para lógica de negócio de TarefaAcademica (MODELO NORMALIZADO)
 *
 * Arquitetura:
 * - 1 tarefa (dados únicos) → N alunos (via tarefaacademica_matricula)
 * - Professor cria tarefa UMA VEZ e atribui para múltiplos alunos
 * - Aluno marca individualmente como feito
 * - Atualizar tarefa afeta TODOS os alunos (dados compartilhados)
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
  #tarefaMatriculaDAO: TarefaAcademicaMatriculaDAO;
  #anexoDAO: AnexoDAO;
  #matriculaDAO: MatriculaDAO;

  constructor(
    tarefaDAODependency: TarefaAcademicaDAO,
    tarefaMatriculaDAODependency: TarefaAcademicaMatriculaDAO,
    anexoDAODependency: AnexoDAO,
    matriculaDAODependency: MatriculaDAO
  ) {
    console.log("⬆️  TarefaAcademicaService.constructor()");
    this.#tarefaDAO = tarefaDAODependency;
    this.#tarefaMatriculaDAO = tarefaMatriculaDAODependency;
    this.#anexoDAO = anexoDAODependency;
    this.#matriculaDAO = matriculaDAODependency;
  }

  /**
   * Criar tarefa e atribuir para múltiplos alunos
   * MODELO NORMALIZADO: 1 tarefa → N atribuições
   */
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

    if (!data.MatriculasGUID || data.MatriculasGUID.length === 0) {
      throw new ErrorResponse(400, "Nenhuma matrícula fornecida", {
        message: "É necessário fornecer ao menos uma matrícula.",
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

    // Validar prazo (não pode ser no passado)
    const prazo = new Date(data.TarefaPrazoData);
    if (isNaN(prazo.getTime()) || prazo < new Date()) {
      throw new ErrorResponse(400, "Prazo inválido", {
        message: "O prazo da tarefa não pode ser no passado.",
      });
    }

    // PASSO 1: Criar tarefa única (dados compartilhados)
    const tarefa = new TarefaAcademica();
    tarefa.TarefaGUID = uuidv4();
    tarefa.matXprofXturxescGUID = data.matXprofXturxescGUID;
    tarefa.TarefaTitulo = data.TarefaTitulo.trim();
    tarefa.TarefaConteudo = data.TarefaConteudo ? data.TarefaConteudo.trim() : null;
    tarefa.TarefaPostagemData = new Date();
    tarefa.TarefaPrazoData = prazo;
    tarefa.TarefaTipoEntrega = data.TarefaTipoEntrega;

    const tarefaCriada = await this.#tarefaDAO.create(tarefa);

    // PASSO 2: Criar atribuições para cada aluno
    const atribuicoes: TarefaAcademicaMatricula[] = data.MatriculasGUID.map((matriculaGUID) => {
      const atrib = new TarefaAcademicaMatricula();
      atrib.TarefaMatriculaGUID = uuidv4();
      atrib.TarefaGUID = tarefaCriada.TarefaGUID;
      atrib.MatriculaGUID = matriculaGUID;
      atrib.TarefaFeito = false;
      atrib.TarefaRealizacaoData = null;
      return atrib;
    });

    await this.#tarefaMatriculaDAO.createBatch(atribuicoes);

    // PASSO 3: Vincular anexos de descrição (se houver)
    if (data.anexosDescricao && data.anexosDescricao.length > 0) {
      for (const anexoGUID of data.anexosDescricao) {
        const anexo = await this.#anexoDAO.findById(anexoGUID);
        if (anexo) {
          await this.#tarefaDAO.vincularAnexo(tarefaCriada.TarefaGUID, anexoGUID, "tarefa");
        }
      }
    }

    // PASSO 4: Retornar DTO completo
    const atribuicoesCriadas = await this.#tarefaMatriculaDAO.findByTarefa(tarefaCriada.TarefaGUID);
    return this.toDTO(tarefaCriada, atribuicoesCriadas);
  };

  /**
   * Alias para criarTarefa (batch agora é o padrão)
   */
  criarTarefasBatch = async (
    data: TarefaAcademicaBatchCreateDTO,
    usuarioCPF?: string
  ): Promise<{ tarefas: TarefaAcademicaDTO[]; count: number }> => {
    console.log(`🟣 TarefaAcademicaService.criarTarefasBatch() - ${data.MatriculasGUID.length} alunos`);

    const tarefaDTO = await this.criarTarefa(data, usuarioCPF);
    
    // Retornar array com UMA tarefa para manter compatibilidade com frontend
    return {
      tarefas: [tarefaDTO],
      count: 1, // 1 tarefa criada (atribuída para N alunos)
    };
  };

  listarTarefas = async (filters?: TarefaAcademicaFilters): Promise<TarefaAcademicaDTO[]> => {
    console.log("🟣 TarefaAcademicaService.listarTarefas()");

    const tarefas = await this.#tarefaDAO.findAll(filters);
    
    // Para cada tarefa, buscar atribuições
    const tarefasCompletas = await Promise.all(
      tarefas.map(async (tarefa) => {
        const atribuicoes = await this.#tarefaMatriculaDAO.findByTarefa(tarefa.TarefaGUID);
        return this.toDTO(tarefa, atribuicoes);
      })
    );

    return tarefasCompletas;
  };

  buscarTarefa = async (TarefaGUID: string): Promise<TarefaAcademicaDTO> => {
    console.log("🟣 TarefaAcademicaService.buscarTarefa()");

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);

    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }

    const atribuicoes = await this.#tarefaMatriculaDAO.findByTarefa(TarefaGUID);

    return this.toDTO(tarefa, atribuicoes);
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
      "TarefaTitulo" | "TarefaConteudo" | "TarefaPrazoData" | "TarefaTipoEntrega"
    >> = {};

    if (data.TarefaTitulo !== undefined) updates.TarefaTitulo = data.TarefaTitulo.trim();
    if (data.TarefaConteudo !== undefined) updates.TarefaConteudo = data.TarefaConteudo?.trim() ?? null;
    if (data.TarefaPrazoData !== undefined) updates.TarefaPrazoData = new Date(data.TarefaPrazoData);
    if (data.TarefaTipoEntrega !== undefined) updates.TarefaTipoEntrega = data.TarefaTipoEntrega;

    const tarefaAtualizada = await this.#tarefaDAO.update(TarefaGUID, updates);

    if (!tarefaAtualizada) {
      throw new ErrorResponse(404, "Tarefa não encontrada após atualização", {
        message: `Não foi possível buscar a tarefa ${TarefaGUID} após atualização.`,
      });
    }

    const atribuicoes = await this.#tarefaMatriculaDAO.findByTarefa(TarefaGUID);

    return this.toDTO(tarefaAtualizada, atribuicoes);
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

    // CASCADE vai excluir automaticamente as atribuições em tarefaacademica_matricula
    return await this.#tarefaDAO.delete(TarefaGUID);
  };

  /**
   * NOVO: Aluno marca tarefa como feita (ou desmarca)
   * Atualiza apenas a atribuição específica deste aluno
   */
  marcarComoFeito = async (
    TarefaGUID: string,
    MatriculaGUID: string,
    TarefaFeito: boolean,
    usuarioCPF?: string
  ): Promise<MatriculaAtribuidaDTO> => {
    console.log("🟣 TarefaAcademicaService.marcarComoFeito()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para marcar tarefa.",
      });
    }

    // Validar que atribuição existe
    const atribuicao = await this.#tarefaMatriculaDAO.findByTarefaAndMatricula(
      TarefaGUID,
      MatriculaGUID
    );

    if (!atribuicao) {
      throw new ErrorResponse(404, "Atribuição não encontrada", {
        message: `Aluno ${MatriculaGUID} não possui a tarefa ${TarefaGUID}`,
      });
    }

    // Atualizar status
    const atribuicaoAtualizada = await this.#tarefaMatriculaDAO.update(
      atribuicao.TarefaMatriculaGUID,
      { TarefaFeito }
    );

    if (!atribuicaoAtualizada) {
      throw new ErrorResponse(500, "Erro ao atualizar status", {
        message: "Falha ao atualizar status da tarefa",
      });
    }

    return {
      TarefaMatriculaGUID: atribuicaoAtualizada.TarefaMatriculaGUID,
      MatriculaGUID: atribuicaoAtualizada.MatriculaGUID,
      TarefaFeito: atribuicaoAtualizada.TarefaFeito,
      TarefaRealizacaoData: atribuicaoAtualizada.TarefaRealizacaoData
        ? atribuicaoAtualizada.TarefaRealizacaoData.toISOString()
        : null,
    };
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

    await this.#tarefaDAO.vincularAnexo(TarefaGUID, AnexoGUID, "resposta");
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
   * Converte TarefaAcademica + Atribuições para TarefaAcademicaDTO (normalizado)
   */
  private toDTO(
    tarefa: TarefaAcademica,
    atribuicoes: TarefaAcademicaMatricula[]
  ): TarefaAcademicaDTO {
    return {
      TarefaGUID: tarefa.TarefaGUID,
      matXprofXturxescGUID: tarefa.matXprofXturxescGUID,
      TarefaTitulo: tarefa.TarefaTitulo,
      TarefaConteudo: tarefa.TarefaConteudo,
      TarefaPostagemData: tarefa.TarefaPostagemData.toISOString(),
      TarefaPrazoData: tarefa.TarefaPrazoData.toISOString(),
      TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
      MatriculasAtribuidas: atribuicoes.map((atrib) => ({
        TarefaMatriculaGUID: atrib.TarefaMatriculaGUID,
        MatriculaGUID: atrib.MatriculaGUID,
        TarefaFeito: atrib.TarefaFeito,
        TarefaRealizacaoData: atrib.TarefaRealizacaoData
          ? atrib.TarefaRealizacaoData.toISOString()
          : null,
      })),
      CreatedAt: tarefa.CreatedAt ? tarefa.CreatedAt.toISOString() : null,
      UpdatedAt: tarefa.UpdatedAt ? tarefa.UpdatedAt.toISOString() : null,
    };
  }
}
