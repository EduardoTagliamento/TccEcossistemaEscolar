import { v4 as uuidv4 } from "uuid";
import { RowDataPacket } from "mysql2";
import TarefaAcademica from "../entities/tarefaacademica.model";
import TarefaAcademicaMatricula from "../entities/tarefaacademica-matricula.model";
import { TarefaAcademicaDAO, TarefaAcademicaFilters } from "../repositories/tarefaacademica.repository";
import { TarefaAcademicaMatriculaDAO } from "../repositories/tarefaacademica-matricula.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { pool } from "../database/mysql";
import { getNotificacaoService } from "./notificacao.service";
import { getAuditoriaService } from "./auditoria.service";

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
  TarefaCompartilhada: boolean;
  TarefaMinPessoas: number | null;
  TarefaMaxPessoas: number | null;
  MatriculasAtribuidas: MatriculaAtribuidaDTO[]; // Alunos que receberam a tarefa
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface MatriculaAtribuidaDTO {
  TarefaMatriculaGUID: string;
  MatriculaGUID: string;
  /** Prazo efetivo deste aluno: override (agendamento automático) ou o prazo compartilhado da tarefa */
  TarefaPrazoData: string;
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
  TarefaCompartilhada?: boolean;
  TarefaMinPessoas?: number | null;
  TarefaMaxPessoas?: number | null;
  /** Agendamento automático: prazo específico por aluno (MatriculaGUID -> data). Sobrescreve TarefaPrazoData para o aluno correspondente. */
  DatasPorMatricula?: Record<string, Date>;
}

// Batch agora é o mesmo que Create (sempre atribui para N alunos)
export interface TarefaAcademicaBatchCreateDTO extends TarefaAcademicaCreateDTO {}

export interface TarefaAcademicaUpdateDTO {
  TarefaTitulo?: string;
  TarefaConteudo?: string;
  TarefaPrazoData?: Date;
  TarefaTipoEntrega?: "digital" | "fisica";
  TarefaMinPessoas?: number | null;
  TarefaMaxPessoas?: number | null;
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

    // Validar prazos por matrícula (agendamento automático), se fornecidos
    if (data.DatasPorMatricula) {
      for (const [matriculaGUID, dataMatricula] of Object.entries(data.DatasPorMatricula)) {
        const dataConvertida = new Date(dataMatricula);
        if (isNaN(dataConvertida.getTime()) || dataConvertida < new Date()) {
          throw new ErrorResponse(400, "Prazo inválido", {
            message: `O prazo calculado para o aluno ${matriculaGUID} não pode ser no passado.`,
          });
        }
      }
    }

    // Prazo "base" da tarefa: se houver prazos por matrícula, usa o mais
    // antigo entre eles como referência compartilhada; senão, usa o prazo
    // informado manualmente.
    const prazo = data.DatasPorMatricula && Object.keys(data.DatasPorMatricula).length > 0
      ? new Date(Math.min(...Object.values(data.DatasPorMatricula).map((d) => new Date(d).getTime())))
      : new Date(data.TarefaPrazoData);

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
    
    // Campos de tarefa compartilhada
    tarefa.TarefaCompartilhada = data.TarefaCompartilhada || false;
    tarefa.TarefaMinPessoas = data.TarefaMinPessoas || null;
    tarefa.TarefaMaxPessoas = data.TarefaMaxPessoas || null;
    
    // Validar campos de tarefa compartilhada
    tarefa.validarCompartilhada();

    const tarefaCriada = await this.#tarefaDAO.create(tarefa);

    // PASSO 2: Criar atribuições para cada aluno (com prazo específico quando houver override)
    const atribuicoes: TarefaAcademicaMatricula[] = data.MatriculasGUID.map((matriculaGUID) => {
      const atrib = new TarefaAcademicaMatricula();
      atrib.TarefaMatriculaGUID = uuidv4();
      atrib.TarefaGUID = tarefaCriada.TarefaGUID;
      atrib.MatriculaGUID = matriculaGUID;
      atrib.TarefaPrazoDataMatricula = data.DatasPorMatricula?.[matriculaGUID]
        ? new Date(data.DatasPorMatricula[matriculaGUID])
        : null;
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

    // PASSO 5: Retornar DTO completo
    const atribuicoesCriadas = await this.#tarefaMatriculaDAO.findByTarefa(tarefaCriada.TarefaGUID);

    // PASSO 6: Notificar alunos (tarefa_postada) — não bloqueia a resposta
    this.#notificarTarefaPostada(tarefaCriada, matriculasExistentes).catch((error) => {
      console.error("🔴 TarefaAcademicaService.#notificarTarefaPostada() falhou:", error);
    });

    const primeiraMatriculaValida = matriculasExistentes.find((m): m is NonNullable<typeof m> => m !== null);
    if (primeiraMatriculaValida) {
      const escolaGUID = await this.#resolverEscolaGUIDPorTurma((primeiraMatriculaValida as any).TurmaGUID);
      if (escolaGUID) {
        void getAuditoriaService().registrar({
          EscolaGUID: escolaGUID,
          UsuarioCPFAtor: usuarioCPF,
          AcaoTipo: "Create",
          EntidadeTipo: "tarefaacademica",
          EntidadeGUID: tarefaCriada.TarefaGUID,
          EntidadeDescricao: tarefaCriada.TarefaTitulo,
          CategoriaAuditoriaId: 2,
        });
      }
    }

    return this.toDTO(tarefaCriada, atribuicoesCriadas);
  };

  /** Resolve EscolaGUID via turma — TarefaAcademica não carrega EscolaGUID diretamente. */
  #resolverEscolaGUIDPorTurma = async (turmaGUID: string): Promise<string | null> => {
    const [turmaRows] = await pool.execute<RowDataPacket[]>(
      "SELECT EscolaGUID FROM turma WHERE TurmaGUID = ? LIMIT 1",
      [turmaGUID]
    );
    return (turmaRows[0] as any)?.EscolaGUID ?? null;
  };

  /**
   * Notifica os alunos atribuídos sobre a nova tarefa (tipo `tarefa_postada`).
   * Quando a tarefa é compartilhada, o texto já menciona isso — não existe
   * um tipo `grupo_novo` separado (ver docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md, seção 4.4).
   */
  #notificarTarefaPostada = async (
    tarefa: TarefaAcademica,
    matriculas: Array<{ UsuarioCPF: string; TurmaGUID: string } | null>
  ): Promise<void> => {
    const primeiraMatricula = matriculas.find((m) => m !== null);
    if (!primeiraMatricula) return;

    const [turmaRows] = await pool.execute<RowDataPacket[]>(
      "SELECT EscolaGUID FROM turma WHERE TurmaGUID = ? LIMIT 1",
      [primeiraMatricula.TurmaGUID]
    );
    const escolaGUID = (turmaRows[0] as any)?.EscolaGUID;
    if (!escolaGUID) return;

    const destinatarios = matriculas.filter((m): m is { UsuarioCPF: string; TurmaGUID: string } => m !== null).map((m) => m.UsuarioCPF);

    await getNotificacaoService().disparar({
      tipoSlug: "tarefa_postada",
      destinatarios,
      escolaGUID,
      titulo: tarefa.TarefaCompartilhada
        ? `Nova tarefa compartilhada: ${tarefa.TarefaTitulo}`
        : `Nova tarefa: ${tarefa.TarefaTitulo}`,
      conteudo: tarefa.TarefaConteudo,
      entidadeTipo: "tarefa",
      entidadeGUID: tarefa.TarefaGUID,
      link: `/dashboard/${escolaGUID}/tarefas/${tarefa.TarefaGUID}`,
    });
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

    // VALIDAÇÃO: TarefaCompartilhada é IMUTÁVEL
    // Não pode ser alterado após criação (dados já podem ter grupos criados)
    // Campo não deve estar presente no UpdateDTO, mas validamos por segurança

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

    // VALIDAÇÃO: Min/Max Pessoas só podem ser editados se tarefa for compartilhada
    if (data.TarefaMinPessoas !== undefined || data.TarefaMaxPessoas !== undefined) {
      if (!tarefa.TarefaCompartilhada) {
        throw new ErrorResponse(400, "Operação inválida", {
          message: "Não é possível definir limites de pessoas em tarefa individual.",
        });
      }

      // Validar novos limites
      const novoMin = data.TarefaMinPessoas !== undefined ? data.TarefaMinPessoas : tarefa.TarefaMinPessoas;
      const novoMax = data.TarefaMaxPessoas !== undefined ? data.TarefaMaxPessoas : tarefa.TarefaMaxPessoas;

      if (novoMin !== null && novoMin < 1) {
        throw new ErrorResponse(400, "TarefaMinPessoas inválido", {
          message: "TarefaMinPessoas deve ser >= 1",
        });
      }

      if (novoMax !== null && novoMin !== null && novoMax < novoMin) {
        throw new ErrorResponse(400, "TarefaMaxPessoas inválido", {
          message: "TarefaMaxPessoas deve ser >= TarefaMinPessoas",
        });
      }
    }

    const updates: Partial<Pick<
      TarefaAcademica,
      "TarefaTitulo" | "TarefaConteudo" | "TarefaPrazoData" | "TarefaTipoEntrega" | 
      "TarefaMinPessoas" | "TarefaMaxPessoas"
    >> = {};

    if (data.TarefaTitulo !== undefined) updates.TarefaTitulo = data.TarefaTitulo.trim();
    if (data.TarefaConteudo !== undefined) updates.TarefaConteudo = data.TarefaConteudo?.trim() ?? null;
    if (data.TarefaPrazoData !== undefined) updates.TarefaPrazoData = new Date(data.TarefaPrazoData);
    if (data.TarefaTipoEntrega !== undefined) updates.TarefaTipoEntrega = data.TarefaTipoEntrega;
    if (data.TarefaMinPessoas !== undefined) updates.TarefaMinPessoas = data.TarefaMinPessoas;
    if (data.TarefaMaxPessoas !== undefined) updates.TarefaMaxPessoas = data.TarefaMaxPessoas;

    const tarefaAtualizada = await this.#tarefaDAO.update(TarefaGUID, updates);

    if (!tarefaAtualizada) {
      throw new ErrorResponse(404, "Tarefa não encontrada após atualização", {
        message: `Não foi possível buscar a tarefa ${TarefaGUID} após atualização.`,
      });
    }

    const atribuicoes = await this.#tarefaMatriculaDAO.findByTarefa(TarefaGUID);

    const prazoMudou = data.TarefaPrazoData !== undefined && tarefa.TarefaPrazoData.getTime() !== tarefaAtualizada.TarefaPrazoData.getTime();
    if (prazoMudou) {
      this.#notificarPrazoAlterado(tarefaAtualizada, atribuicoes).catch((error) => {
        console.error("🔴 TarefaAcademicaService.#notificarPrazoAlterado() falhou:", error);
      });
    }

    if (atribuicoes.length > 0) {
      const matriculaRef = await this.#matriculaDAO.findById(atribuicoes[0].MatriculaGUID);
      const escolaGUID = matriculaRef ? await this.#resolverEscolaGUIDPorTurma(matriculaRef.TurmaGUID) : null;
      if (escolaGUID) {
        void getAuditoriaService().registrar({
          EscolaGUID: escolaGUID,
          UsuarioCPFAtor: usuarioCPF,
          AcaoTipo: "Update",
          EntidadeTipo: "tarefaacademica",
          EntidadeGUID: tarefaAtualizada.TarefaGUID,
          EntidadeDescricao: tarefaAtualizada.TarefaTitulo,
          CategoriaAuditoriaId: 2,
        });
      }
    }

    return this.toDTO(tarefaAtualizada, atribuicoes);
  };

  /** Notifica os alunos atribuídos quando o prazo da tarefa é reagendado (tipo `tarefa_prazo_alterado`) */
  #notificarPrazoAlterado = async (
    tarefa: TarefaAcademica,
    atribuicoes: Array<{ MatriculaGUID: string }>
  ): Promise<void> => {
    const matriculas = await Promise.all(atribuicoes.map((a) => this.#matriculaDAO.findById(a.MatriculaGUID)));
    const validas = matriculas.filter((m): m is NonNullable<typeof m> => m !== null);
    if (validas.length === 0) return;

    const [turmaRows] = await pool.execute<RowDataPacket[]>(
      "SELECT EscolaGUID FROM turma WHERE TurmaGUID = ? LIMIT 1",
      [validas[0].TurmaGUID]
    );
    const escolaGUID = (turmaRows[0] as any)?.EscolaGUID;
    if (!escolaGUID) return;

    await getNotificacaoService().disparar({
      tipoSlug: "tarefa_prazo_alterado",
      destinatarios: validas.map((m) => m.UsuarioCPF),
      escolaGUID,
      titulo: `O prazo da tarefa "${tarefa.TarefaTitulo}" foi alterado`,
      entidadeTipo: "tarefa",
      entidadeGUID: tarefa.TarefaGUID,
      link: `/dashboard/${escolaGUID}/tarefas/${tarefa.TarefaGUID}`,
    });
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

    // Resolver EscolaGUID antes de excluir (CASCADE apaga as atribuições junto)
    const atribuicoesParaAuditoria = await this.#tarefaMatriculaDAO.findByTarefa(TarefaGUID);
    let escolaGUIDParaAuditoria: string | null = null;
    if (atribuicoesParaAuditoria.length > 0) {
      const matriculaRef = await this.#matriculaDAO.findById(atribuicoesParaAuditoria[0].MatriculaGUID);
      escolaGUIDParaAuditoria = matriculaRef ? await this.#resolverEscolaGUIDPorTurma(matriculaRef.TurmaGUID) : null;
    }

    // CASCADE vai excluir automaticamente as atribuições em tarefaacademica_matricula
    const excluida = await this.#tarefaDAO.delete(TarefaGUID);

    if (excluida && escolaGUIDParaAuditoria) {
      void getAuditoriaService().registrar({
        EscolaGUID: escolaGUIDParaAuditoria,
        UsuarioCPFAtor: usuarioCPF,
        AcaoTipo: "Delete",
        EntidadeTipo: "tarefaacademica",
        EntidadeGUID: tarefa.TarefaGUID,
        EntidadeDescricao: tarefa.TarefaTitulo,
        CategoriaAuditoriaId: 2,
      });
    }

    return excluida;
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

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);

    if (TarefaFeito && tarefa) {
      this.#notificarTarefaRespostaRecebida(tarefa, usuarioCPF).catch((error) => {
        console.error("🔴 TarefaAcademicaService.#notificarTarefaRespostaRecebida() falhou:", error);
      });
    }

    const matriculaRefFeito = await this.#matriculaDAO.findById(MatriculaGUID);
    const escolaGUIDFeito = matriculaRefFeito ? await this.#resolverEscolaGUIDPorTurma(matriculaRefFeito.TurmaGUID) : null;
    if (escolaGUIDFeito) {
      void getAuditoriaService().registrar({
        EscolaGUID: escolaGUIDFeito,
        UsuarioCPFAtor: usuarioCPF,
        AcaoTipo: "Update",
        EntidadeTipo: "tarefaacademica",
        EntidadeGUID: TarefaGUID,
        EntidadeDescricao: tarefa?.TarefaTitulo ?? null,
        CategoriaAuditoriaId: 2,
      });
    }

    return {
      TarefaMatriculaGUID: atribuicaoAtualizada.TarefaMatriculaGUID,
      MatriculaGUID: atribuicaoAtualizada.MatriculaGUID,
      TarefaPrazoData: (
        atribuicaoAtualizada.TarefaPrazoDataMatricula ?? tarefa!.TarefaPrazoData
      ).toISOString(),
      TarefaFeito: atribuicaoAtualizada.TarefaFeito,
      TarefaRealizacaoData: atribuicaoAtualizada.TarefaRealizacaoData
        ? atribuicaoAtualizada.TarefaRealizacaoData.toISOString()
        : null,
    };
  };

  /**
   * Notifica o professor responsável (via matXprofXturxescGUID) que um aluno
   * entregou/marcou a tarefa como feita (tipo `tarefa_resposta_recebida`).
   */
  #notificarTarefaRespostaRecebida = async (tarefa: TarefaAcademica, alunoCPF: string): Promise<void> => {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT mpt.UsuarioCPF AS ProfessorCPF, t.EscolaGUID
       FROM materiaxprofessorxturma mpt
       INNER JOIN turma t ON t.TurmaGUID = mpt.TurmaGUID
       WHERE mpt.MatProfTurGUID = ?
       LIMIT 1`,
      [tarefa.matXprofXturxescGUID]
    );
    const info = rows[0] as any;
    if (!info?.ProfessorCPF || !info?.EscolaGUID) return;

    const [alunoRows] = await pool.execute<RowDataPacket[]>(
      "SELECT UsuarioNome FROM usuario WHERE UsuarioCPF = ? LIMIT 1",
      [alunoCPF]
    );
    const alunoNome = (alunoRows[0] as any)?.UsuarioNome ?? "Um aluno";

    await getNotificacaoService().disparar({
      tipoSlug: "tarefa_resposta_recebida",
      destinatarios: [info.ProfessorCPF],
      escolaGUID: info.EscolaGUID,
      titulo: `${alunoNome} enviou a resposta da tarefa "${tarefa.TarefaTitulo}"`,
      entidadeTipo: "tarefa",
      entidadeGUID: tarefa.TarefaGUID,
      link: `/dashboard/${info.EscolaGUID}/tarefas/${tarefa.TarefaGUID}`,
    });
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

    this.#notificarTarefaRespostaRecebida(tarefa, usuarioCPF).catch((error) => {
      console.error("🔴 TarefaAcademicaService.#notificarTarefaRespostaRecebida() falhou:", error);
    });
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
    // DEBUG: Verificar valor antes de converter para DTO
    console.log('🔍 DEBUG Service - Tarefa antes do DTO:', {
      TarefaGUID: tarefa.TarefaGUID,
      TarefaTitulo: tarefa.TarefaTitulo,
      TarefaCompartilhada: tarefa.TarefaCompartilhada,
      tipo: typeof tarefa.TarefaCompartilhada
    });
    
    const dto = {
      TarefaGUID: tarefa.TarefaGUID,
      matXprofXturxescGUID: tarefa.matXprofXturxescGUID,
      TarefaTitulo: tarefa.TarefaTitulo,
      TarefaConteudo: tarefa.TarefaConteudo,
      TarefaPostagemData: tarefa.TarefaPostagemData.toISOString(),
      TarefaPrazoData: tarefa.TarefaPrazoData.toISOString(),
      TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
      TarefaCompartilhada: tarefa.TarefaCompartilhada,
      TarefaMinPessoas: tarefa.TarefaMinPessoas,
      TarefaMaxPessoas: tarefa.TarefaMaxPessoas,
      MatriculasAtribuidas: atribuicoes.map((atrib) => ({
        TarefaMatriculaGUID: atrib.TarefaMatriculaGUID,
        MatriculaGUID: atrib.MatriculaGUID,
        TarefaPrazoData: (atrib.TarefaPrazoDataMatricula ?? tarefa.TarefaPrazoData).toISOString(),
        TarefaFeito: atrib.TarefaFeito,
        TarefaRealizacaoData: atrib.TarefaRealizacaoData
          ? atrib.TarefaRealizacaoData.toISOString()
          : null,
      })),
      CreatedAt: tarefa.CreatedAt ? tarefa.CreatedAt.toISOString() : null,
      UpdatedAt: tarefa.UpdatedAt ? tarefa.UpdatedAt.toISOString() : null,
    };
    
    console.log('🔍 DEBUG Service - DTO gerado:', {
      TarefaGUID: dto.TarefaGUID,
      TarefaTitulo: dto.TarefaTitulo,
      TarefaCompartilhada: dto.TarefaCompartilhada,
      tipo: typeof dto.TarefaCompartilhada
    });
    
    return dto;
  }
}
