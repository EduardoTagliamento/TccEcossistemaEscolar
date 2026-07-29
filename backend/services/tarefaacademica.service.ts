import { v4 as uuidv4 } from "uuid";
import { RowDataPacket } from "mysql2";
import TarefaAcademica from "../entities/tarefaacademica.model";
import TarefaAcademicaMatricula from "../entities/tarefaacademica-matricula.model";
import TarefaAcademicaQuestao from "../entities/tarefaacademica-questao.model";
import TarefaAcademicaAlternativa from "../entities/tarefaacademica-alternativa.model";
import TarefaAcademicaResposta from "../entities/tarefaacademica-resposta.model";
import { TarefaAcademicaDAO, TarefaAcademicaFilters } from "../repositories/tarefaacademica.repository";
import { TarefaAcademicaMatriculaDAO } from "../repositories/tarefaacademica-matricula.repository";
import { TarefaAcademicaQuestaoDAO, AnexoQuestaoResumo } from "../repositories/tarefaacademica-questao.repository";
import { TarefaAcademicaAlternativaDAO } from "../repositories/tarefaacademica-alternativa.repository";
import { TarefaAcademicaRespostaDAO } from "../repositories/tarefaacademica-resposta.repository";
import { AnexoDAO } from "../repositories/anexo.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";
import { CategoriaConteudoDAO } from "../repositories/categoriaconteudo.repository";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
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
  TarefaTipoEntrega: "digital" | "fisica" | "lista";
  CategoriaGUID: string | null;
  TarefaCompartilhada: boolean;
  TarefaMinPessoas: number | null;
  TarefaMaxPessoas: number | null;
  MatriculasAtribuidas: MatriculaAtribuidaDTO[]; // Alunos que receberam a tarefa
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface AnexoEntregaResumoDTO {
  AnexoGUID: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: string | null;
}

export interface MatriculaAtribuidaDTO {
  TarefaMatriculaGUID: string;
  MatriculaGUID: string;
  /** Nome do aluno dono da matrícula — resolvido via JOIN matricula+usuario, null se o aluno foi removido. */
  AlunoNome: string | null;
  /** Anexos de entrega enviados por ESTE aluno (nunca de outros alunos da mesma tarefa). */
  AnexosEntrega: AnexoEntregaResumoDTO[];
  /** Prazo efetivo deste aluno: override (agendamento automático) ou o prazo compartilhado da tarefa */
  TarefaPrazoData: string;
  TarefaFeito: boolean;
  TarefaRealizacaoData: string | null;
  TarefaNota: number | null;
  TarefaAvaliadoEm: string | null;
  TarefaAvaliadoPorCPF: string | null;
}

export interface TarefaAcademicaCreateDTO {
  MatriculasGUID: string[]; // Array de GUIDs (normalizado)
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo?: string;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: "digital" | "fisica" | "lista";
  CategoriaGUID?: string | null;
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
  TarefaTipoEntrega?: "digital" | "fisica" | "lista";
  CategoriaGUID?: string | null;
  TarefaMinPessoas?: number | null;
  TarefaMaxPessoas?: number | null;
}

/**
 * DTOs - Questão de tarefa "lista" (quiz estilo Forms)
 */

export interface AlternativaInputDTO {
  AlternativaTexto: string;
  AlternativaCorreta: boolean;
  AlternativaPontos: number;
}

export interface AlternativaDTO extends AlternativaInputDTO {
  AlternativaGUID: string;
  AlternativaOrdem: number;
}

export interface QuestaoCreateDTO {
  QuestaoEnunciado: string;
  QuestaoTipo: "objetiva" | "discursiva";
  QuestaoPontosMaximos: number;
  QuestaoExplicacao?: string | null;
  Alternativas?: AlternativaInputDTO[];
  AnexosGUID?: string[];
}

export interface QuestaoUpdateDTO {
  QuestaoEnunciado?: string;
  QuestaoTipo?: "objetiva" | "discursiva";
  QuestaoPontosMaximos?: number;
  QuestaoExplicacao?: string | null;
  Alternativas?: AlternativaInputDTO[];
}

export interface QuestaoAnexoResumoDTO {
  AnexoGUID: string;
  AnexoNomeOriginal: string | null;
  AnexoTamanho: number | null;
  CreatedAt: string | null;
}

export interface QuestaoDTO {
  QuestaoGUID: string;
  TarefaGUID: string;
  QuestaoEnunciado: string;
  QuestaoTipo: "objetiva" | "discursiva";
  QuestaoPontosMaximos: number;
  QuestaoExplicacao: string | null;
  QuestaoOrdem: number;
  Alternativas: AlternativaDTO[];
  Anexos: QuestaoAnexoResumoDTO[];
  TemResposta: boolean;
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

/** Uma linha já normalizada da planilha de importação (parse feito no frontend). */
export interface QuestaoImportRowDTO extends QuestaoCreateDTO {
  /** Linha original na planilha (1-based) — usado só pra apontar o erro no lugar certo. */
  LinhaOriginal: number;
}

export interface ImportacaoErroDTO {
  linha: number;
  mensagem: string;
}

export interface ImportacaoResultadoDTO {
  criadas: QuestaoDTO[];
  count: number;
  erros: ImportacaoErroDTO[];
}

export interface RespostaDTO {
  RespostaGUID: string;
  QuestaoGUID: string;
  AlternativaGUID: string | null;
  RespostaTextoDiscursiva: string | null;
  RespostaPontosObtidos: number | null;
  RespostaAvaliadoEm: string | null;
  RespostaAvaliadoPorCPF: string | null;
  RespondidoEm: string | null;
}

/** Alternativa na visão do aluno — gabarito (Correta/Pontos) só revelado depois que ele respondeu essa questão. */
export interface AlternativaAlunoDTO {
  AlternativaGUID: string;
  AlternativaTexto: string;
  AlternativaOrdem: number;
  AlternativaCorreta: boolean | null;
  AlternativaPontos: number | null;
}

/** Visão do professor (correção) — Alternativas sempre completas (gabarito nunca mascarado). */
export interface QuestaoComRespostaProfessorDTO {
  QuestaoGUID: string;
  QuestaoEnunciado: string;
  QuestaoTipo: "objetiva" | "discursiva";
  QuestaoPontosMaximos: number;
  QuestaoExplicacao: string | null;
  QuestaoOrdem: number;
  Alternativas: AlternativaDTO[];
  Anexos: QuestaoAnexoResumoDTO[];
  Resposta: {
    RespostaGUID: string;
    AlternativaGUID: string | null;
    RespostaTextoDiscursiva: string | null;
    RespostaPontosObtidos: number | null;
    RespostaAvaliadoPorCPF: string | null;
    RespondidoEm: string | null;
  } | null;
}

export interface QuestaoComRespostaDTO {
  QuestaoGUID: string;
  QuestaoEnunciado: string;
  QuestaoTipo: "objetiva" | "discursiva";
  QuestaoPontosMaximos: number;
  /** Só aparece depois de resolvida (objetiva: na hora; discursiva: só depois de corrigida). */
  QuestaoExplicacao: string | null;
  QuestaoOrdem: number;
  Alternativas: AlternativaAlunoDTO[];
  Anexos: QuestaoAnexoResumoDTO[];
  MinhaResposta: {
    RespostaGUID: string;
    AlternativaGUID: string | null;
    RespostaTextoDiscursiva: string | null;
    RespostaPontosObtidos: number | null;
    Corrigida: boolean;
  } | null;
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
  #categoriaDAO: CategoriaConteudoDAO;
  #alocacaoDAO: MaterialProfessorTurmaDAO;
  #questaoDAO: TarefaAcademicaQuestaoDAO;
  #alternativaDAO: TarefaAcademicaAlternativaDAO;
  #respostaDAO: TarefaAcademicaRespostaDAO;
  constructor(
    tarefaDAODependency: TarefaAcademicaDAO,
    tarefaMatriculaDAODependency: TarefaAcademicaMatriculaDAO,
    anexoDAODependency: AnexoDAO,
    matriculaDAODependency: MatriculaDAO,
    categoriaDAODependency: CategoriaConteudoDAO,
    alocacaoDAODependency: MaterialProfessorTurmaDAO,
    questaoDAODependency: TarefaAcademicaQuestaoDAO,
    alternativaDAODependency: TarefaAcademicaAlternativaDAO,
    respostaDAODependency: TarefaAcademicaRespostaDAO
  ) {
    console.log("⬆️  TarefaAcademicaService.constructor()");
    this.#tarefaDAO = tarefaDAODependency;
    this.#tarefaMatriculaDAO = tarefaMatriculaDAODependency;
    this.#anexoDAO = anexoDAODependency;
    this.#matriculaDAO = matriculaDAODependency;
    this.#categoriaDAO = categoriaDAODependency;
    this.#alocacaoDAO = alocacaoDAODependency;
    this.#questaoDAO = questaoDAODependency;
    this.#alternativaDAO = alternativaDAODependency;
    this.#respostaDAO = respostaDAODependency;
  }

  /** Valida que a categoria (se informada) pertence ao professor e à mesma turma do alocação da tarefa. */
  #validarCategoria = async (categoriaGUID: string | null | undefined, matXprofXturxescGUID: string, usuarioCPF: string): Promise<void> => {
    if (!categoriaGUID) return;

    const categoria = await this.#categoriaDAO.findById(categoriaGUID);
    if (!categoria) {
      throw new ErrorResponse(404, "Categoria não encontrada", {
        message: `Não existe categoria com id ${categoriaGUID}`,
      });
    }

    const alocacao = await this.#alocacaoDAO.findById(matXprofXturxescGUID);
    if (!alocacao) {
      throw new ErrorResponse(404, "Alocação não encontrada", {
        message: `Não existe alocação com id ${matXprofXturxescGUID}`,
      });
    }

    if (
      categoria.UsuarioCPF !== usuarioCPF ||
      categoria.MateriaGUID !== alocacao.MateriaGUID ||
      categoria.TurmaGUID !== alocacao.TurmaGUID
    ) {
      throw new ErrorResponse(403, "Categoria inválida", {
        message: "Essa categoria não pertence a você para esta matéria/turma.",
      });
    }
  };

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

    await this.#validarCategoria(data.CategoriaGUID, data.matXprofXturxescGUID, usuarioCPF);

    // PASSO 1: Criar tarefa única (dados compartilhados)
    const tarefa = new TarefaAcademica();
    tarefa.TarefaGUID = uuidv4();
    tarefa.matXprofXturxescGUID = data.matXprofXturxescGUID;
    tarefa.TarefaTitulo = data.TarefaTitulo.trim();
    tarefa.TarefaConteudo = data.TarefaConteudo ? data.TarefaConteudo.trim() : null;
    tarefa.TarefaPostagemData = new Date();
    tarefa.TarefaPrazoData = prazo;
    tarefa.TarefaTipoEntrega = data.TarefaTipoEntrega;
    tarefa.CategoriaGUID = data.CategoriaGUID ?? null;
    
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

  /**
   * @param usuarioCPFFiltro Quando informado, restringe `MatriculasAtribuidas` à
   * matrícula pertencente a esse CPF — usado quando um aluno consulta a própria
   * tarefa (uma linha de TarefaAcademica é compartilhada por N alunos da turma;
   * sem esse filtro, todo aluno veria a lista completa de colegas).
   */
  buscarTarefa = async (TarefaGUID: string, usuarioCPFFiltro?: string): Promise<TarefaAcademicaDTO> => {
    console.log("🟣 TarefaAcademicaService.buscarTarefa()");

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);

    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }

    let atribuicoes = await this.#tarefaMatriculaDAO.findByTarefa(TarefaGUID);

    if (usuarioCPFFiltro) {
      const infoPorMatricula = await this.#buscarInfoPorMatricula(
        atribuicoes.map((atrib) => atrib.MatriculaGUID)
      );
      atribuicoes = atribuicoes.filter(
        (atrib) => infoPorMatricula.get(atrib.MatriculaGUID)?.UsuarioCPF === usuarioCPFFiltro
      );
    }

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

    const alocacaoAtualizar = await this.#alocacaoDAO.findById(tarefa.matXprofXturxescGUID);
    if (!alocacaoAtualizar || alocacaoAtualizar.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Só o professor responsável por esta tarefa pode atualizá-la.",
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

    if (data.CategoriaGUID !== undefined) {
      await this.#validarCategoria(data.CategoriaGUID, tarefa.matXprofXturxescGUID, usuarioCPF);
    }

    const updates: Partial<Pick<
      TarefaAcademica,
      "TarefaTitulo" | "TarefaConteudo" | "TarefaPrazoData" | "TarefaTipoEntrega" | "CategoriaGUID" |
      "TarefaMinPessoas" | "TarefaMaxPessoas"
    >> = {};

    if (data.TarefaTitulo !== undefined) updates.TarefaTitulo = data.TarefaTitulo.trim();
    if (data.TarefaConteudo !== undefined) updates.TarefaConteudo = data.TarefaConteudo?.trim() ?? null;
    if (data.TarefaPrazoData !== undefined) updates.TarefaPrazoData = new Date(data.TarefaPrazoData);
    if (data.TarefaTipoEntrega !== undefined) updates.TarefaTipoEntrega = data.TarefaTipoEntrega;
    if (data.CategoriaGUID !== undefined) updates.CategoriaGUID = data.CategoriaGUID;
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

    const alocacaoExcluir = await this.#alocacaoDAO.findById(tarefa.matXprofXturxescGUID);
    if (!alocacaoExcluir || alocacaoExcluir.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Só o professor responsável por esta tarefa pode excluí-la.",
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

    const infoPorMatricula = await this.#buscarInfoPorMatricula([atribuicaoAtualizada.MatriculaGUID]);
    const anexosPorMatricula = await this.#tarefaDAO.buscarAnexosEntregaPorMatricula([atribuicaoAtualizada.TarefaMatriculaGUID]);

    return {
      TarefaMatriculaGUID: atribuicaoAtualizada.TarefaMatriculaGUID,
      MatriculaGUID: atribuicaoAtualizada.MatriculaGUID,
      AlunoNome: infoPorMatricula.get(atribuicaoAtualizada.MatriculaGUID)?.UsuarioNome ?? null,
      AnexosEntrega: this.#mapAnexosEntrega(anexosPorMatricula.get(atribuicaoAtualizada.TarefaMatriculaGUID) ?? []),
      TarefaPrazoData: (
        atribuicaoAtualizada.TarefaPrazoDataMatricula ?? tarefa!.TarefaPrazoData
      ).toISOString(),
      TarefaFeito: atribuicaoAtualizada.TarefaFeito,
      TarefaRealizacaoData: atribuicaoAtualizada.TarefaRealizacaoData
        ? atribuicaoAtualizada.TarefaRealizacaoData.toISOString()
        : null,
      TarefaNota: atribuicaoAtualizada.TarefaNota,
      TarefaAvaliadoEm: atribuicaoAtualizada.TarefaAvaliadoEm ? atribuicaoAtualizada.TarefaAvaliadoEm.toISOString() : null,
      TarefaAvaliadoPorCPF: atribuicaoAtualizada.TarefaAvaliadoPorCPF,
    };
  };

  /**
   * Notifica o professor responsável (via matXprofXturxescGUID) que um aluno
   * entregou/marcou a tarefa como feita (tipo `tarefa_resposta_recebida`).
   */
  /**
   * Professor atribui nota (0-10) a uma entrega de tarefa (digital ou
   * presencial). Dispara `tarefa_avaliada` pro aluno.
   */
  avaliarTarefa = async (
    TarefaMatriculaGUID: string,
    nota: number,
    professorCPF: string
  ): Promise<MatriculaAtribuidaDTO> => {
    console.log("🟣 TarefaAcademicaService.avaliarTarefa()");

    if (nota < 0 || nota > 10 || isNaN(nota)) {
      throw new ErrorResponse(400, "Nota inválida", {
        message: "A nota deve ser um número entre 0 e 10.",
      });
    }

    // Buscar a atribuição diretamente pelo seu próprio GUID (não temos TarefaGUID+MatriculaGUID aqui)
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT * FROM tarefaacademica_matricula WHERE TarefaMatriculaGUID = ? LIMIT 1`,
      [TarefaMatriculaGUID]
    );
    if (rows.length === 0) {
      throw new ErrorResponse(404, "Atribuição não encontrada", {
        message: `Não existe atribuição de tarefa com id ${TarefaMatriculaGUID}`,
      });
    }
    const linha = rows[0] as any;

    const tarefa = await this.#tarefaDAO.findById(linha.TarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${linha.TarefaGUID}`,
      });
    }

    const alocacao = await this.#alocacaoDAO.findById(tarefa.matXprofXturxescGUID);
    if (!alocacao || alocacao.UsuarioCPF !== professorCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Só o professor responsável por esta tarefa pode avaliá-la.",
      });
    }

    // Só dá pra avaliar depois que o aluno enviou/marcou a entrega — antes
    // disso não há o que corrigir. Se o prazo já venceu sem entrega, o
    // scheduler (tarefaacademicanota.scheduler.ts) já zerou automaticamente;
    // esse zero automático não é "corrigível" manualmente por aqui (o aluno
    // nunca entregou).
    if (!linha.TarefaFeito) {
      throw new ErrorResponse(400, "Entrega pendente", {
        message: "Só é possível avaliar depois que o aluno enviar ou marcar a tarefa como feita.",
      });
    }

    const atribuicaoAtualizada = await this.#tarefaMatriculaDAO.update(TarefaMatriculaGUID, {
      TarefaNota: nota,
      TarefaAvaliadoEm: new Date(),
      TarefaAvaliadoPorCPF: professorCPF,
    });

    if (!atribuicaoAtualizada) {
      throw new ErrorResponse(500, "Erro ao avaliar tarefa");
    }

    const matricula = await this.#matriculaDAO.findById(atribuicaoAtualizada.MatriculaGUID);
    if (matricula) {
      const escolaGUID = await this.#resolverEscolaGUIDPorTurma(matricula.TurmaGUID);
      if (escolaGUID) {
        await getNotificacaoService().disparar({
          tipoSlug: "tarefa_avaliada",
          destinatarios: [matricula.UsuarioCPF],
          escolaGUID,
          titulo: `Sua tarefa "${tarefa.TarefaTitulo}" foi avaliada: nota ${nota.toFixed(2)}`,
          entidadeTipo: "tarefa",
          entidadeGUID: tarefa.TarefaGUID,
          link: `/dashboard/${escolaGUID}/tarefas/${tarefa.TarefaGUID}`,
        });

        void getAuditoriaService().registrar({
          EscolaGUID: escolaGUID,
          UsuarioCPFAtor: professorCPF,
          AcaoTipo: "Update",
          EntidadeTipo: "tarefaacademicamatricula",
          EntidadeGUID: TarefaMatriculaGUID,
          EntidadeDescricao: `Nota ${nota.toFixed(2)} atribuída em "${tarefa.TarefaTitulo}"`,
          CategoriaAuditoriaId: 2,
        });
      }
    }

    const infoPorMatricula = await this.#buscarInfoPorMatricula([atribuicaoAtualizada.MatriculaGUID]);
    const anexosPorMatricula = await this.#tarefaDAO.buscarAnexosEntregaPorMatricula([atribuicaoAtualizada.TarefaMatriculaGUID]);

    return {
      TarefaMatriculaGUID: atribuicaoAtualizada.TarefaMatriculaGUID,
      MatriculaGUID: atribuicaoAtualizada.MatriculaGUID,
      AlunoNome: infoPorMatricula.get(atribuicaoAtualizada.MatriculaGUID)?.UsuarioNome ?? null,
      AnexosEntrega: this.#mapAnexosEntrega(anexosPorMatricula.get(atribuicaoAtualizada.TarefaMatriculaGUID) ?? []),
      TarefaPrazoData: (atribuicaoAtualizada.TarefaPrazoDataMatricula ?? tarefa.TarefaPrazoData).toISOString(),
      TarefaFeito: atribuicaoAtualizada.TarefaFeito,
      TarefaRealizacaoData: atribuicaoAtualizada.TarefaRealizacaoData
        ? atribuicaoAtualizada.TarefaRealizacaoData.toISOString()
        : null,
      TarefaNota: atribuicaoAtualizada.TarefaNota,
      TarefaAvaliadoEm: atribuicaoAtualizada.TarefaAvaliadoEm ? atribuicaoAtualizada.TarefaAvaliadoEm.toISOString() : null,
      TarefaAvaliadoPorCPF: atribuicaoAtualizada.TarefaAvaliadoPorCPF,
    };
  };

  /**
   * Dashboard do aluno: tarefas com prazo no futuro e ainda não feitas.
   * Explicitamente NÃO inclui atrasadas nem já enviadas/marcadas.
   */
  listarPendentesAluno = async (usuarioCPF: string): Promise<Array<{
    TarefaGUID: string;
    TarefaTitulo: string;
    TarefaPrazoData: string;
    MateriaGUID: string;
    MateriaNome: string;
    TurmaGUID: string;
    TurmaNome: string;
  }>> => {
    console.log("🟣 TarefaAcademicaService.listarPendentesAluno()");

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT t.TarefaGUID, t.TarefaTitulo,
              COALESCE(tm.TarefaPrazoDataMatricula, t.TarefaPrazoData) AS TarefaPrazoData,
              mat.MateriaGUID, mat.MateriaNome, tu.TurmaGUID, tu.TurmaNome
       FROM tarefaacademica_matricula tm
       INNER JOIN tarefaacademica t ON t.TarefaGUID = tm.TarefaGUID
       INNER JOIN matricula m ON m.MatriculaGUID = tm.MatriculaGUID
       INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
       INNER JOIN materia mat ON mat.MateriaGUID = mpt.MateriaGUID
       INNER JOIN turma tu ON tu.TurmaGUID = mpt.TurmaGUID
       WHERE m.UsuarioCPF = ?
         AND tm.TarefaFeito = FALSE
         AND COALESCE(tm.TarefaPrazoDataMatricula, t.TarefaPrazoData) > NOW()
       ORDER BY TarefaPrazoData ASC`,
      [usuarioCPF]
    );

    return rows.map((row: any) => ({
      TarefaGUID: row.TarefaGUID,
      TarefaTitulo: row.TarefaTitulo,
      TarefaPrazoData: new Date(row.TarefaPrazoData).toISOString(),
      MateriaGUID: row.MateriaGUID,
      MateriaNome: row.MateriaNome,
      TurmaGUID: row.TurmaGUID,
      TurmaNome: row.TurmaNome,
    }));
  };

  /**
   * Dashboard do professor: entregas já feitas/marcadas, ainda sem nota.
   */
  listarPendentesAvaliacaoProfessor = async (usuarioCPF: string): Promise<Array<{
    TarefaMatriculaGUID: string;
    TarefaGUID: string;
    TarefaTitulo: string;
    MateriaGUID: string;
    MateriaNome: string;
    TurmaGUID: string;
    TurmaNome: string;
    AlunoNome: string;
  }>> => {
    console.log("🟣 TarefaAcademicaService.listarPendentesAvaliacaoProfessor()");

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT tm.TarefaMatriculaGUID, t.TarefaGUID, t.TarefaTitulo,
              mat.MateriaGUID, mat.MateriaNome, tu.TurmaGUID, tu.TurmaNome, u.UsuarioNome AS AlunoNome
       FROM tarefaacademica_matricula tm
       INNER JOIN tarefaacademica t ON t.TarefaGUID = tm.TarefaGUID
       INNER JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
       INNER JOIN materia mat ON mat.MateriaGUID = mpt.MateriaGUID
       INNER JOIN turma tu ON tu.TurmaGUID = mpt.TurmaGUID
       INNER JOIN matricula m ON m.MatriculaGUID = tm.MatriculaGUID
       INNER JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF
       WHERE mpt.UsuarioCPF = ?
         AND tm.TarefaFeito = TRUE
         AND tm.TarefaNota IS NULL
       ORDER BY tm.TarefaRealizacaoData ASC`,
      [usuarioCPF]
    );

    return rows.map((row: any) => ({
      TarefaMatriculaGUID: row.TarefaMatriculaGUID,
      TarefaGUID: row.TarefaGUID,
      TarefaTitulo: row.TarefaTitulo,
      MateriaGUID: row.MateriaGUID,
      MateriaNome: row.MateriaNome,
      TurmaGUID: row.TurmaGUID,
      TurmaNome: row.TurmaNome,
      AlunoNome: row.AlunoNome,
    }));
  };

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

    if (anexo.UsuarioCPF !== usuarioCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode enviar como entrega um anexo que você mesmo enviou.",
      });
    }

    // Resolve a atribuição (TarefaAcademicaMatricula) do aluno autenticado
    // dentro desta tarefa — uma TarefaAcademica é compartilhada por N alunos
    // da turma, então a entrega precisa ficar amarrada à atribuição de UM
    // aluno específico (TarefaMatriculaGUID), nunca só ao TarefaGUID.
    const atribuicoes = await this.#tarefaMatriculaDAO.findByTarefa(TarefaGUID);
    const infoPorMatricula = await this.#buscarInfoPorMatricula(atribuicoes.map((a) => a.MatriculaGUID));
    const minhaAtribuicao = atribuicoes.find(
      (a) => infoPorMatricula.get(a.MatriculaGUID)?.UsuarioCPF === usuarioCPF
    );

    if (!minhaAtribuicao) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não está atribuído a esta tarefa.",
      });
    }

    await this.#tarefaDAO.vincularAnexo(TarefaGUID, AnexoGUID, "resposta", minhaAtribuicao.TarefaMatriculaGUID);

    // Enviar o anexo É a entrega da tarefa digital — marca automaticamente
    // como feito (mesmo efeito de marcarComoFeito(true)), sem exigir que o
    // aluno também clique num checkbox separado depois de já ter enviado.
    const matricula = await this.#matriculaDAO.findMatriculaAtivaByUsuario(usuarioCPF);
    if (matricula) {
      const atribuicao = await this.#tarefaMatriculaDAO.findByTarefaAndMatricula(TarefaGUID, matricula.MatriculaGUID);
      if (atribuicao && !atribuicao.TarefaFeito) {
        await this.#tarefaMatriculaDAO.update(atribuicao.TarefaMatriculaGUID, { TarefaFeito: true });
      }
    }

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

    const vinculo = await this.#tarefaDAO.buscarVinculoAnexo(TarefaGUID, AnexoGUID);
    if (!vinculo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: "Este anexo não está vinculado a esta tarefa.",
      });
    }

    if (vinculo.AnexoTipo === "entrega") {
      // Entrega: só o próprio aluno dono da atribuição pode remover.
      const infoPorMatricula = vinculo.TarefaMatriculaGUID
        ? await this.#buscarInfoPorMatriculaTarefa([vinculo.TarefaMatriculaGUID])
        : new Map<string, { UsuarioCPF: string; UsuarioNome: string }>();
      const donoCPF = vinculo.TarefaMatriculaGUID
        ? infoPorMatricula.get(vinculo.TarefaMatriculaGUID)?.UsuarioCPF
        : undefined;

      if (donoCPF !== usuarioCPF) {
        throw new ErrorResponse(403, "Sem permissão", {
          message: "Você só pode remover a própria entrega.",
        });
      }
    } else {
      // Material de apoio (descrição): só o professor responsável pela tarefa.
      const alocacao = await this.#alocacaoDAO.findById(tarefa.matXprofXturxescGUID);
      if (!alocacao || alocacao.UsuarioCPF !== usuarioCPF) {
        throw new ErrorResponse(403, "Sem permissão", {
          message: "Só o professor responsável por esta tarefa pode remover o material de apoio.",
        });
      }
    }

    await this.#tarefaDAO.desvincularAnexo(TarefaGUID, AnexoGUID);
  };

  // ========== Métodos Auxiliares ==========

  /**
   * Resolve MatriculaGUID -> {UsuarioCPF, UsuarioNome} em uma única query
   * (evita N+1 ao montar MatriculasAtribuidas). Usado pela tela de avaliação
   * do professor (nome em vez do GUID cru da matrícula) e para filtrar
   * "minha matrícula" quando um aluno consulta a própria tarefa.
   */
  #buscarInfoPorMatricula = async (
    matriculaGUIDs: string[]
  ): Promise<Map<string, { UsuarioCPF: string; UsuarioNome: string }>> => {
    const unicos = Array.from(new Set(matriculaGUIDs));
    if (unicos.length === 0) return new Map();

    const placeholders = unicos.map(() => "?").join(", ");
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT m.MatriculaGUID, u.UsuarioCPF, u.UsuarioNome
       FROM matricula m
       INNER JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF
       WHERE m.MatriculaGUID IN (${placeholders})`,
      unicos
    );

    return new Map(rows.map((row: any) => [row.MatriculaGUID, { UsuarioCPF: row.UsuarioCPF, UsuarioNome: row.UsuarioNome }]));
  };

  /**
   * Igual a #buscarInfoPorMatricula, mas indexado por TarefaMatriculaGUID em
   * vez de MatriculaGUID — usado onde só se tem a atribuição em mãos (ex.:
   * validar dono de um anexo de entrega em removerAnexo).
   */
  #buscarInfoPorMatriculaTarefa = async (
    tarefaMatriculaGUIDs: string[]
  ): Promise<Map<string, { UsuarioCPF: string; UsuarioNome: string }>> => {
    const unicos = Array.from(new Set(tarefaMatriculaGUIDs));
    if (unicos.length === 0) return new Map();

    const placeholders = unicos.map(() => "?").join(", ");
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT tm.TarefaMatriculaGUID, u.UsuarioCPF, u.UsuarioNome
       FROM tarefaacademica_matricula tm
       INNER JOIN matricula m ON m.MatriculaGUID = tm.MatriculaGUID
       INNER JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF
       WHERE tm.TarefaMatriculaGUID IN (${placeholders})`,
      unicos
    );

    return new Map(rows.map((row: any) => [row.TarefaMatriculaGUID, { UsuarioCPF: row.UsuarioCPF, UsuarioNome: row.UsuarioNome }]));
  };

  #mapAnexosEntrega = (
    lista: Array<{ AnexoGUID: string; AnexoNomeOriginal: string | null; AnexoTamanho: number | null; CreatedAt: Date | null }>
  ): AnexoEntregaResumoDTO[] =>
    lista.map((anexo) => ({
      AnexoGUID: anexo.AnexoGUID,
      AnexoNomeOriginal: anexo.AnexoNomeOriginal,
      AnexoTamanho: anexo.AnexoTamanho,
      CreatedAt: anexo.CreatedAt ? new Date(anexo.CreatedAt).toISOString() : null,
    }));

  /**
   * Converte TarefaAcademica + Atribuições para TarefaAcademicaDTO (normalizado)
   */
  private toDTO = async (
    tarefa: TarefaAcademica,
    atribuicoes: TarefaAcademicaMatricula[]
  ): Promise<TarefaAcademicaDTO> => {
    const infoPorMatricula = await this.#buscarInfoPorMatricula(
      atribuicoes.map((atrib) => atrib.MatriculaGUID)
    );
    const anexosPorMatricula = await this.#tarefaDAO.buscarAnexosEntregaPorMatricula(
      atribuicoes.map((atrib) => atrib.TarefaMatriculaGUID)
    );

    const dto = {
      TarefaGUID: tarefa.TarefaGUID,
      matXprofXturxescGUID: tarefa.matXprofXturxescGUID,
      TarefaTitulo: tarefa.TarefaTitulo,
      TarefaConteudo: tarefa.TarefaConteudo,
      TarefaPostagemData: tarefa.TarefaPostagemData.toISOString(),
      TarefaPrazoData: tarefa.TarefaPrazoData.toISOString(),
      TarefaTipoEntrega: tarefa.TarefaTipoEntrega,
      CategoriaGUID: tarefa.CategoriaGUID,
      TarefaCompartilhada: tarefa.TarefaCompartilhada,
      TarefaMinPessoas: tarefa.TarefaMinPessoas,
      TarefaMaxPessoas: tarefa.TarefaMaxPessoas,
      MatriculasAtribuidas: atribuicoes.map((atrib) => ({
        TarefaMatriculaGUID: atrib.TarefaMatriculaGUID,
        MatriculaGUID: atrib.MatriculaGUID,
        AlunoNome: infoPorMatricula.get(atrib.MatriculaGUID)?.UsuarioNome ?? null,
        AnexosEntrega: this.#mapAnexosEntrega(anexosPorMatricula.get(atrib.TarefaMatriculaGUID) ?? []),
        TarefaPrazoData: (atrib.TarefaPrazoDataMatricula ?? tarefa.TarefaPrazoData).toISOString(),
        TarefaFeito: atrib.TarefaFeito,
        TarefaRealizacaoData: atrib.TarefaRealizacaoData
          ? atrib.TarefaRealizacaoData.toISOString()
          : null,
        TarefaNota: atrib.TarefaNota,
        TarefaAvaliadoEm: atrib.TarefaAvaliadoEm ? atrib.TarefaAvaliadoEm.toISOString() : null,
        TarefaAvaliadoPorCPF: atrib.TarefaAvaliadoPorCPF,
      })),
      CreatedAt: tarefa.CreatedAt ? tarefa.CreatedAt.toISOString() : null,
      UpdatedAt: tarefa.UpdatedAt ? tarefa.UpdatedAt.toISOString() : null,
    };

    return dto;
  };

  // ========== Questão de tarefa "lista" (quiz estilo Forms) ==========

  /** Busca a tarefa, confirma que é do tipo 'lista' e que o professor é o dono. */
  #validarTarefaListaDoProfessor = async (TarefaGUID: string, professorCPF: string): Promise<TarefaAcademica> => {
    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }
    if (tarefa.TarefaTipoEntrega !== "lista") {
      throw new ErrorResponse(400, "Tipo de tarefa inválido", {
        message: "Esta operação só é válida para tarefas do tipo 'lista'.",
      });
    }
    const alocacao = await this.#alocacaoDAO.findById(tarefa.matXprofXturxescGUID);
    if (!alocacao || alocacao.UsuarioCPF !== professorCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Só o professor responsável por esta tarefa pode gerenciar suas questões.",
      });
    }
    return tarefa;
  };

  /** Valida o conjunto de alternativas de uma questão objetiva: mínimo 2, exatamente 1 correta. */
  #validarAlternativas = (alternativas: AlternativaInputDTO[] | undefined): void => {
    if (!alternativas || alternativas.length < 2) {
      throw new ErrorResponse(400, "Alternativas inválidas", {
        message: "Uma questão objetiva precisa de ao menos 2 alternativas.",
      });
    }
    const corretas = alternativas.filter((a) => a.AlternativaCorreta === true);
    if (corretas.length !== 1) {
      throw new ErrorResponse(400, "Alternativas inválidas", {
        message: "Exatamente uma alternativa deve ser marcada como correta.",
      });
    }
  };

  /** Busca a questão criada/atualizada por trás, resolvendo alternativas/anexos/TemResposta, pra devolver o DTO completo. */
  #buscarQuestaoDTO = async (QuestaoGUID: string): Promise<QuestaoDTO> => {
    const questao = await this.#questaoDAO.findById(QuestaoGUID);
    if (!questao) {
      throw new ErrorResponse(404, "Questão não encontrada", {
        message: `Não existe questão com id ${QuestaoGUID}`,
      });
    }
    const alternativas = questao.QuestaoTipo === "objetiva" ? await this.#alternativaDAO.findByQuestao(QuestaoGUID) : [];
    const anexosPorQuestao = await this.#questaoDAO.buscarAnexosPorQuestoes([QuestaoGUID]);
    const temResposta = await this.#respostaDAO.existeRespostaParaQuestao(QuestaoGUID);
    return this.#mapQuestaoParaDTO(questao, alternativas, anexosPorQuestao.get(QuestaoGUID) ?? [], temResposta);
  };

  #mapQuestaoParaDTO = (
    questao: TarefaAcademicaQuestao,
    alternativas: TarefaAcademicaAlternativa[],
    anexos: AnexoQuestaoResumo[],
    temResposta: boolean
  ): QuestaoDTO => ({
    QuestaoGUID: questao.QuestaoGUID,
    TarefaGUID: questao.TarefaGUID,
    QuestaoEnunciado: questao.QuestaoEnunciado,
    QuestaoTipo: questao.QuestaoTipo,
    QuestaoPontosMaximos: questao.QuestaoPontosMaximos,
    QuestaoExplicacao: questao.QuestaoExplicacao,
    QuestaoOrdem: questao.QuestaoOrdem,
    Alternativas: alternativas.map((a) => ({
      AlternativaGUID: a.AlternativaGUID,
      AlternativaTexto: a.AlternativaTexto,
      AlternativaCorreta: a.AlternativaCorreta,
      AlternativaPontos: a.AlternativaPontos,
      AlternativaOrdem: a.AlternativaOrdem,
    })),
    Anexos: anexos.map((a) => ({
      AnexoGUID: a.AnexoGUID,
      AnexoNomeOriginal: a.AnexoNomeOriginal,
      AnexoTamanho: a.AnexoTamanho,
      CreatedAt: a.CreatedAt ? new Date(a.CreatedAt).toISOString() : null,
    })),
    TemResposta: temResposta,
    CreatedAt: questao.CreatedAt ? questao.CreatedAt.toISOString() : null,
    UpdatedAt: questao.UpdatedAt ? questao.UpdatedAt.toISOString() : null,
  });

  /** Professor cria uma questão (objetiva ou discursiva) numa tarefa 'lista'. */
  criarQuestao = async (TarefaGUID: string, data: QuestaoCreateDTO, professorCPF: string): Promise<QuestaoDTO> => {
    console.log("🟣 TarefaAcademicaService.criarQuestao()");

    await this.#validarTarefaListaDoProfessor(TarefaGUID, professorCPF);

    if (data.QuestaoTipo === "objetiva") {
      this.#validarAlternativas(data.Alternativas);
    }

    const questoesExistentes = await this.#questaoDAO.findByTarefa(TarefaGUID);
    const proximaOrdem = questoesExistentes.length > 0 ? Math.max(...questoesExistentes.map((q) => q.QuestaoOrdem)) + 1 : 0;

    const questao = new TarefaAcademicaQuestao();
    questao.QuestaoGUID = uuidv4();
    questao.TarefaGUID = TarefaGUID;
    questao.QuestaoEnunciado = data.QuestaoEnunciado;
    questao.QuestaoTipo = data.QuestaoTipo;
    questao.QuestaoPontosMaximos = data.QuestaoPontosMaximos;
    questao.QuestaoExplicacao = data.QuestaoExplicacao ?? null;
    questao.QuestaoOrdem = proximaOrdem;

    await this.#questaoDAO.create(questao);

    if (data.QuestaoTipo === "objetiva" && data.Alternativas) {
      const alternativas = data.Alternativas.map((a, index) => {
        const alternativa = new TarefaAcademicaAlternativa();
        alternativa.AlternativaGUID = uuidv4();
        alternativa.QuestaoGUID = questao.QuestaoGUID;
        alternativa.AlternativaTexto = a.AlternativaTexto;
        alternativa.AlternativaCorreta = a.AlternativaCorreta;
        alternativa.AlternativaPontos = a.AlternativaPontos;
        alternativa.AlternativaOrdem = index;
        return alternativa;
      });
      await this.#alternativaDAO.createBatch(alternativas);
    }

    if (data.AnexosGUID && data.AnexosGUID.length > 0) {
      for (const anexoGUID of data.AnexosGUID) {
        const anexo = await this.#anexoDAO.findById(anexoGUID);
        if (anexo && anexo.UsuarioCPF === professorCPF) {
          await this.#questaoDAO.vincularAnexo(questao.QuestaoGUID, anexoGUID);
        }
      }
    }

    return this.#buscarQuestaoDTO(questao.QuestaoGUID);
  };

  /** Professor cria N questões de uma vez (usado pelo construtor manual do TarefaForm — 1 chamada, não N). */
  criarQuestoesBatch = async (
    TarefaGUID: string,
    questoesData: QuestaoCreateDTO[],
    professorCPF: string
  ): Promise<{ criadas: QuestaoDTO[]; count: number }> => {
    console.log(`🟣 TarefaAcademicaService.criarQuestoesBatch() - ${questoesData.length} questões`);

    await this.#validarTarefaListaDoProfessor(TarefaGUID, professorCPF);

    if (questoesData.length === 0) {
      throw new ErrorResponse(400, "Nenhuma questão fornecida", {
        message: "É necessário fornecer ao menos uma questão.",
      });
    }

    for (const data of questoesData) {
      if (data.QuestaoTipo === "objetiva") {
        this.#validarAlternativas(data.Alternativas);
      }
    }

    const questoesExistentes = await this.#questaoDAO.findByTarefa(TarefaGUID);
    let proximaOrdem = questoesExistentes.length > 0 ? Math.max(...questoesExistentes.map((q) => q.QuestaoOrdem)) + 1 : 0;

    const questoesEntidade = questoesData.map((data) => {
      const questao = new TarefaAcademicaQuestao();
      questao.QuestaoGUID = uuidv4();
      questao.TarefaGUID = TarefaGUID;
      questao.QuestaoEnunciado = data.QuestaoEnunciado;
      questao.QuestaoTipo = data.QuestaoTipo;
      questao.QuestaoPontosMaximos = data.QuestaoPontosMaximos;
      questao.QuestaoExplicacao = data.QuestaoExplicacao ?? null;
      questao.QuestaoOrdem = proximaOrdem++;
      return questao;
    });

    await this.#questaoDAO.createBatch(questoesEntidade);

    const todasAlternativas: TarefaAcademicaAlternativa[] = [];
    questoesEntidade.forEach((questao, idx) => {
      const data = questoesData[idx];
      if (data.QuestaoTipo === "objetiva" && data.Alternativas) {
        data.Alternativas.forEach((a, index) => {
          const alternativa = new TarefaAcademicaAlternativa();
          alternativa.AlternativaGUID = uuidv4();
          alternativa.QuestaoGUID = questao.QuestaoGUID;
          alternativa.AlternativaTexto = a.AlternativaTexto;
          alternativa.AlternativaCorreta = a.AlternativaCorreta;
          alternativa.AlternativaPontos = a.AlternativaPontos;
          alternativa.AlternativaOrdem = index;
          todasAlternativas.push(alternativa);
        });
      }
    });
    if (todasAlternativas.length > 0) {
      await this.#alternativaDAO.createBatch(todasAlternativas);
    }

    for (let idx = 0; idx < questoesEntidade.length; idx++) {
      const anexosGUID = questoesData[idx].AnexosGUID;
      if (anexosGUID && anexosGUID.length > 0) {
        for (const anexoGUID of anexosGUID) {
          const anexo = await this.#anexoDAO.findById(anexoGUID);
          if (anexo && anexo.UsuarioCPF === professorCPF) {
            await this.#questaoDAO.vincularAnexo(questoesEntidade[idx].QuestaoGUID, anexoGUID);
          }
        }
      }
    }

    const criadas = await Promise.all(questoesEntidade.map((q) => this.#buscarQuestaoDTO(q.QuestaoGUID)));

    return { criadas, count: criadas.length };
  };

  /**
   * Professor importa questões de uma planilha (linhas já normalizadas pelo
   * frontend). Diferente de criarQuestoesBatch: cada linha é tentada
   * independentemente (try/catch por linha) — uma linha inválida não derruba
   * as demais, e o erro é reportado apontando a linha original da planilha.
   */
  importarQuestoesPlanilha = async (
    TarefaGUID: string,
    linhas: QuestaoImportRowDTO[],
    professorCPF: string
  ): Promise<ImportacaoResultadoDTO> => {
    console.log(`🟣 TarefaAcademicaService.importarQuestoesPlanilha() - ${linhas.length} linhas`);

    await this.#validarTarefaListaDoProfessor(TarefaGUID, professorCPF);

    const questoesExistentes = await this.#questaoDAO.findByTarefa(TarefaGUID);
    let proximaOrdem = questoesExistentes.length > 0 ? Math.max(...questoesExistentes.map((q) => q.QuestaoOrdem)) + 1 : 0;

    const criadas: QuestaoDTO[] = [];
    const erros: ImportacaoErroDTO[] = [];

    for (const linha of linhas) {
      try {
        if (linha.QuestaoTipo === "objetiva") {
          this.#validarAlternativas(linha.Alternativas);
        }

        const questao = new TarefaAcademicaQuestao();
        questao.QuestaoGUID = uuidv4();
        questao.TarefaGUID = TarefaGUID;
        questao.QuestaoEnunciado = linha.QuestaoEnunciado;
        questao.QuestaoTipo = linha.QuestaoTipo;
        questao.QuestaoPontosMaximos = linha.QuestaoPontosMaximos;
        questao.QuestaoExplicacao = linha.QuestaoExplicacao ?? null;
        questao.QuestaoOrdem = proximaOrdem;

        await this.#questaoDAO.create(questao);

        if (linha.QuestaoTipo === "objetiva" && linha.Alternativas) {
          const alternativas = linha.Alternativas.map((a, index) => {
            const alternativa = new TarefaAcademicaAlternativa();
            alternativa.AlternativaGUID = uuidv4();
            alternativa.QuestaoGUID = questao.QuestaoGUID;
            alternativa.AlternativaTexto = a.AlternativaTexto;
            alternativa.AlternativaCorreta = a.AlternativaCorreta;
            alternativa.AlternativaPontos = a.AlternativaPontos;
            alternativa.AlternativaOrdem = index;
            return alternativa;
          });
          await this.#alternativaDAO.createBatch(alternativas);
        }

        criadas.push(await this.#buscarQuestaoDTO(questao.QuestaoGUID));
        proximaOrdem++;
      } catch (erro: any) {
        erros.push({ linha: linha.LinhaOriginal, mensagem: erro?.message || "Erro ao importar questão" });
      }
    }

    return { criadas, count: criadas.length, erros };
  };

  /**
   * Lista as questões de uma tarefa 'lista'. Só o professor dono da tarefa —
   * a visão do aluno (com respostas e sem revelar gabarito antecipadamente)
   * é `buscarQuestoesComRespostas`.
   */
  listarQuestoes = async (TarefaGUID: string, professorCPF: string): Promise<QuestaoDTO[]> => {
    console.log("🟣 TarefaAcademicaService.listarQuestoes()");

    await this.#validarTarefaListaDoProfessor(TarefaGUID, professorCPF);

    const questoes = await this.#questaoDAO.findByTarefa(TarefaGUID);
    if (questoes.length === 0) return [];

    const questaoGUIDs = questoes.map((q) => q.QuestaoGUID);
    const alternativasPorQuestao = await this.#alternativaDAO.findByQuestoes(questaoGUIDs);
    const anexosPorQuestao = await this.#questaoDAO.buscarAnexosPorQuestoes(questaoGUIDs);

    return Promise.all(
      questoes.map(async (questao) => {
        const temResposta = await this.#respostaDAO.existeRespostaParaQuestao(questao.QuestaoGUID);
        return this.#mapQuestaoParaDTO(
          questao,
          alternativasPorQuestao.get(questao.QuestaoGUID) ?? [],
          anexosPorQuestao.get(questao.QuestaoGUID) ?? [],
          temResposta
        );
      })
    );
  };

  /** Professor atualiza uma questão. Mudança estrutural (Tipo, Alternativas) é bloqueada se já existir resposta. */
  atualizarQuestao = async (QuestaoGUID: string, data: QuestaoUpdateDTO, professorCPF: string): Promise<QuestaoDTO> => {
    console.log("🟣 TarefaAcademicaService.atualizarQuestao()");

    const questao = await this.#questaoDAO.findById(QuestaoGUID);
    if (!questao) {
      throw new ErrorResponse(404, "Questão não encontrada", {
        message: `Não existe questão com id ${QuestaoGUID}`,
      });
    }
    await this.#validarTarefaListaDoProfessor(questao.TarefaGUID, professorCPF);

    const temResposta = await this.#respostaDAO.existeRespostaParaQuestao(QuestaoGUID);

    if (temResposta && data.QuestaoTipo !== undefined && data.QuestaoTipo !== questao.QuestaoTipo) {
      throw new ErrorResponse(400, "Operação inválida", {
        message: "Não é possível mudar o tipo de uma questão que já tem resposta registrada.",
      });
    }
    if (temResposta && data.Alternativas !== undefined) {
      throw new ErrorResponse(400, "Operação inválida", {
        message: "Não é possível alterar as alternativas de uma questão que já tem resposta registrada.",
      });
    }

    const tipoFinal = data.QuestaoTipo ?? questao.QuestaoTipo;
    if (tipoFinal === "objetiva" && data.Alternativas !== undefined) {
      this.#validarAlternativas(data.Alternativas);
    }

    const updates: Partial<Pick<TarefaAcademicaQuestao, "QuestaoEnunciado" | "QuestaoTipo" | "QuestaoPontosMaximos" | "QuestaoExplicacao">> = {};
    if (data.QuestaoEnunciado !== undefined) updates.QuestaoEnunciado = data.QuestaoEnunciado;
    if (data.QuestaoTipo !== undefined) updates.QuestaoTipo = data.QuestaoTipo;
    if (data.QuestaoPontosMaximos !== undefined) updates.QuestaoPontosMaximos = data.QuestaoPontosMaximos;
    if (data.QuestaoExplicacao !== undefined) updates.QuestaoExplicacao = data.QuestaoExplicacao;

    await this.#questaoDAO.update(QuestaoGUID, updates);

    if (data.Alternativas !== undefined) {
      await this.#alternativaDAO.deleteByQuestao(QuestaoGUID);
      const alternativas = data.Alternativas.map((a, index) => {
        const alternativa = new TarefaAcademicaAlternativa();
        alternativa.AlternativaGUID = uuidv4();
        alternativa.QuestaoGUID = QuestaoGUID;
        alternativa.AlternativaTexto = a.AlternativaTexto;
        alternativa.AlternativaCorreta = a.AlternativaCorreta;
        alternativa.AlternativaPontos = a.AlternativaPontos;
        alternativa.AlternativaOrdem = index;
        return alternativa;
      });
      await this.#alternativaDAO.createBatch(alternativas);
    }

    return this.#buscarQuestaoDTO(QuestaoGUID);
  };

  /** Professor exclui uma questão — bloqueado se já existir resposta registrada. */
  excluirQuestao = async (QuestaoGUID: string, professorCPF: string): Promise<void> => {
    console.log("🟣 TarefaAcademicaService.excluirQuestao()");

    const questao = await this.#questaoDAO.findById(QuestaoGUID);
    if (!questao) {
      throw new ErrorResponse(404, "Questão não encontrada", {
        message: `Não existe questão com id ${QuestaoGUID}`,
      });
    }
    await this.#validarTarefaListaDoProfessor(questao.TarefaGUID, professorCPF);

    const temResposta = await this.#respostaDAO.existeRespostaParaQuestao(QuestaoGUID);
    if (temResposta) {
      throw new ErrorResponse(400, "Operação inválida", {
        message: "Não é possível excluir uma questão que já tem resposta registrada.",
      });
    }

    await this.#questaoDAO.delete(QuestaoGUID);
  };

  /** Professor reordena as questões de uma tarefa 'lista' (drag-and-drop no construtor). */
  reordenarQuestoes = async (
    TarefaGUID: string,
    ordens: Array<{ QuestaoGUID: string; QuestaoOrdem: number }>,
    professorCPF: string
  ): Promise<void> => {
    console.log("🟣 TarefaAcademicaService.reordenarQuestoes()");

    await this.#validarTarefaListaDoProfessor(TarefaGUID, professorCPF);

    const questoesExistentes = await this.#questaoDAO.findByTarefa(TarefaGUID);
    const guidsValidos = new Set(questoesExistentes.map((q) => q.QuestaoGUID));
    for (const { QuestaoGUID } of ordens) {
      if (!guidsValidos.has(QuestaoGUID)) {
        throw new ErrorResponse(400, "Questão inválida", {
          message: `A questão ${QuestaoGUID} não pertence a esta tarefa.`,
        });
      }
    }

    await this.#questaoDAO.reordenar(ordens);
  };

  /** Professor vincula um anexo (que ele mesmo enviou) a uma questão — vários anexos por questão são permitidos. */
  vincularAnexoQuestao = async (QuestaoGUID: string, AnexoGUID: string, professorCPF: string): Promise<void> => {
    console.log("🟣 TarefaAcademicaService.vincularAnexoQuestao()");

    const questao = await this.#questaoDAO.findById(QuestaoGUID);
    if (!questao) {
      throw new ErrorResponse(404, "Questão não encontrada", {
        message: `Não existe questão com id ${QuestaoGUID}`,
      });
    }
    await this.#validarTarefaListaDoProfessor(questao.TarefaGUID, professorCPF);

    const anexo = await this.#anexoDAO.findById(AnexoGUID);
    if (!anexo) {
      throw new ErrorResponse(404, "Anexo não encontrado", {
        message: `Não existe anexo com id ${AnexoGUID}`,
      });
    }
    if (anexo.UsuarioCPF !== professorCPF) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode vincular um anexo que você mesmo enviou.",
      });
    }

    await this.#questaoDAO.vincularAnexo(QuestaoGUID, AnexoGUID);
  };

  /** Professor desvincula um anexo de uma questão. */
  desvincularAnexoQuestao = async (QuestaoGUID: string, AnexoGUID: string, professorCPF: string): Promise<void> => {
    console.log("🟣 TarefaAcademicaService.desvincularAnexoQuestao()");

    const questao = await this.#questaoDAO.findById(QuestaoGUID);
    if (!questao) {
      throw new ErrorResponse(404, "Questão não encontrada", {
        message: `Não existe questão com id ${QuestaoGUID}`,
      });
    }
    await this.#validarTarefaListaDoProfessor(questao.TarefaGUID, professorCPF);

    await this.#questaoDAO.desvincularAnexo(QuestaoGUID, AnexoGUID);
  };

  // ========== Resposta do aluno a tarefa "lista" ==========

  #mapRespostaParaDTO = (resposta: TarefaAcademicaResposta): RespostaDTO => ({
    RespostaGUID: resposta.RespostaGUID,
    QuestaoGUID: resposta.QuestaoGUID,
    AlternativaGUID: resposta.AlternativaGUID,
    RespostaTextoDiscursiva: resposta.RespostaTextoDiscursiva,
    RespostaPontosObtidos: resposta.RespostaPontosObtidos,
    RespostaAvaliadoEm: resposta.RespostaAvaliadoEm ? resposta.RespostaAvaliadoEm.toISOString() : null,
    RespostaAvaliadoPorCPF: resposta.RespostaAvaliadoPorCPF,
    RespondidoEm: resposta.RespondidoEm ? resposta.RespondidoEm.toISOString() : null,
  });

  /** Resolve a tarefa (tipo 'lista') + a atribuição do aluno autenticado, com as checagens comuns a toda resposta. */
  #resolverAtribuicaoListaDoAluno = async (
    TarefaGUID: string,
    alunoCPF: string
  ): Promise<{ tarefa: TarefaAcademica; atribuicao: TarefaAcademicaMatricula }> => {
    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }
    if (tarefa.TarefaTipoEntrega !== "lista") {
      throw new ErrorResponse(400, "Tipo de tarefa inválido", {
        message: "Esta operação só é válida para tarefas do tipo 'lista'.",
      });
    }

    const matricula = await this.#matriculaDAO.findMatriculaAtivaByUsuario(alunoCPF);
    if (!matricula) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não tem matrícula ativa.",
      });
    }

    const atribuicao = await this.#tarefaMatriculaDAO.findByTarefaAndMatricula(TarefaGUID, matricula.MatriculaGUID);
    if (!atribuicao) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não está atribuído a esta tarefa.",
      });
    }

    if (atribuicao.TarefaFeito) {
      throw new ErrorResponse(400, "Lista já concluída", {
        message: "Esta lista já foi concluída e não aceita mais respostas.",
      });
    }

    const prazoEfetivo = atribuicao.TarefaPrazoDataMatricula ?? tarefa.TarefaPrazoData;
    if (prazoEfetivo.getTime() < Date.now()) {
      throw new ErrorResponse(400, "Prazo vencido", {
        message: "O prazo desta tarefa já venceu.",
      });
    }

    return { tarefa, atribuicao };
  };

  /**
   * Depois de toda resposta/correção: fecha a submissão (TarefaFeito=true)
   * assim que todas as questões tiverem resposta, e só ESCREVE TarefaNota
   * quando todas já estiverem corrigidas (objetivas: automático; discursivas:
   * dependem do professor). TarefaAvaliadoPorCPF reflete correção humana se
   * alguma discursiva foi corrigida por um professor, senão fica null
   * (mantém o sinal canônico usado pelo scheduler/board).
   */
  #tentarSettleTarefaLista = async (TarefaMatriculaGUID: string): Promise<void> => {
    const agregado = (await this.#respostaDAO.buscarAgregadoPorAluno([TarefaMatriculaGUID])).get(TarefaMatriculaGUID);
    if (!agregado || agregado.TotalQuestoes === 0) return;

    const updates: Partial<Pick<TarefaAcademicaMatricula, "TarefaFeito" | "TarefaNota" | "TarefaAvaliadoEm" | "TarefaAvaliadoPorCPF">> = {};

    if (agregado.QuestoesRespondidas >= agregado.TotalQuestoes) {
      updates.TarefaFeito = true;
    }

    if (agregado.QuestoesCorrigidas >= agregado.TotalQuestoes) {
      const notaFinal = agregado.PontosMaximosTotal > 0
        ? Math.round((agregado.PontosObtidos / agregado.PontosMaximosTotal) * 1000) / 100
        : 0;
      updates.TarefaNota = notaFinal;
      updates.TarefaAvaliadoEm = new Date();
      updates.TarefaAvaliadoPorCPF = await this.#respostaDAO.buscarAvaliadorHumano(TarefaMatriculaGUID);
    }

    if (Object.keys(updates).length > 0) {
      await this.#tarefaMatriculaDAO.update(TarefaMatriculaGUID, updates);
    }
  };

  /** Aluno responde uma questão objetiva — correção automática, pontos resolvidos na hora. */
  responderObjetiva = async (
    TarefaGUID: string,
    QuestaoGUID: string,
    AlternativaGUID: string,
    alunoCPF: string
  ): Promise<RespostaDTO> => {
    console.log("🟣 TarefaAcademicaService.responderObjetiva()");

    const { atribuicao } = await this.#resolverAtribuicaoListaDoAluno(TarefaGUID, alunoCPF);

    const questao = await this.#questaoDAO.findById(QuestaoGUID);
    if (!questao || questao.TarefaGUID !== TarefaGUID) {
      throw new ErrorResponse(404, "Questão não encontrada", {
        message: `Não existe questão com id ${QuestaoGUID} nesta tarefa.`,
      });
    }
    if (questao.QuestaoTipo !== "objetiva") {
      throw new ErrorResponse(400, "Operação inválida", {
        message: "Esta questão não é objetiva.",
      });
    }

    const alternativa = await this.#alternativaDAO.findById(AlternativaGUID);
    if (!alternativa || alternativa.QuestaoGUID !== QuestaoGUID) {
      throw new ErrorResponse(404, "Alternativa não encontrada", {
        message: `A alternativa ${AlternativaGUID} não pertence à questão ${QuestaoGUID}.`,
      });
    }

    const resposta = await this.#respostaDAO.upsertObjetiva(
      atribuicao.TarefaMatriculaGUID,
      QuestaoGUID,
      AlternativaGUID,
      alternativa.AlternativaPontos
    );

    await this.#tentarSettleTarefaLista(atribuicao.TarefaMatriculaGUID);

    return this.#mapRespostaParaDTO(resposta);
  };

  /** Aluno responde uma questão discursiva — pontos ficam null até correção do professor. */
  responderDiscursiva = async (
    TarefaGUID: string,
    QuestaoGUID: string,
    texto: string,
    alunoCPF: string
  ): Promise<RespostaDTO> => {
    console.log("🟣 TarefaAcademicaService.responderDiscursiva()");

    const { atribuicao } = await this.#resolverAtribuicaoListaDoAluno(TarefaGUID, alunoCPF);

    const questao = await this.#questaoDAO.findById(QuestaoGUID);
    if (!questao || questao.TarefaGUID !== TarefaGUID) {
      throw new ErrorResponse(404, "Questão não encontrada", {
        message: `Não existe questão com id ${QuestaoGUID} nesta tarefa.`,
      });
    }
    if (questao.QuestaoTipo !== "discursiva") {
      throw new ErrorResponse(400, "Operação inválida", {
        message: "Esta questão não é discursiva.",
      });
    }

    const resposta = await this.#respostaDAO.upsertDiscursiva(atribuicao.TarefaMatriculaGUID, QuestaoGUID, texto.trim());

    await this.#tentarSettleTarefaLista(atribuicao.TarefaMatriculaGUID);

    return this.#mapRespostaParaDTO(resposta);
  };

  /**
   * Visão do aluno: todas as questões da tarefa + a resposta dele em cada
   * uma (pra retomar de onde parou). Gabarito (AlternativaCorreta/Pontos) e
   * QuestaoExplicacao só aparecem depois que a questão foi resolvida —
   * objetiva na hora, discursiva só depois de corrigida.
   */
  buscarQuestoesComRespostas = async (TarefaGUID: string, alunoCPF: string): Promise<QuestaoComRespostaDTO[]> => {
    console.log("🟣 TarefaAcademicaService.buscarQuestoesComRespostas()");

    const tarefa = await this.#tarefaDAO.findById(TarefaGUID);
    if (!tarefa) {
      throw new ErrorResponse(404, "Tarefa não encontrada", {
        message: `Não existe tarefa com id ${TarefaGUID}`,
      });
    }
    if (tarefa.TarefaTipoEntrega !== "lista") {
      throw new ErrorResponse(400, "Tipo de tarefa inválido", {
        message: "Esta operação só é válida para tarefas do tipo 'lista'.",
      });
    }

    const matricula = await this.#matriculaDAO.findMatriculaAtivaByUsuario(alunoCPF);
    if (!matricula) {
      throw new ErrorResponse(403, "Sem permissão", { message: "Você não tem matrícula ativa." });
    }
    const atribuicao = await this.#tarefaMatriculaDAO.findByTarefaAndMatricula(TarefaGUID, matricula.MatriculaGUID);
    if (!atribuicao) {
      throw new ErrorResponse(403, "Sem permissão", { message: "Você não está atribuído a esta tarefa." });
    }

    const questoes = await this.#questaoDAO.findByTarefa(TarefaGUID);
    if (questoes.length === 0) return [];

    const questaoGUIDs = questoes.map((q) => q.QuestaoGUID);
    const alternativasPorQuestao = await this.#alternativaDAO.findByQuestoes(questaoGUIDs);
    const anexosPorQuestao = await this.#questaoDAO.buscarAnexosPorQuestoes(questaoGUIDs);
    const respostas = await this.#respostaDAO.findByMatricula(atribuicao.TarefaMatriculaGUID);
    const respostaPorQuestao = new Map(respostas.map((r) => [r.QuestaoGUID, r]));

    return questoes.map((questao) => {
      const resposta = respostaPorQuestao.get(questao.QuestaoGUID) ?? null;
      const respondida = resposta !== null;
      const corrigida = resposta !== null && resposta.RespostaPontosObtidos !== null;
      const resolvida = questao.QuestaoTipo === "objetiva" ? respondida : corrigida;
      const alternativas = alternativasPorQuestao.get(questao.QuestaoGUID) ?? [];
      const anexos = anexosPorQuestao.get(questao.QuestaoGUID) ?? [];

      return {
        QuestaoGUID: questao.QuestaoGUID,
        QuestaoEnunciado: questao.QuestaoEnunciado,
        QuestaoTipo: questao.QuestaoTipo,
        QuestaoPontosMaximos: questao.QuestaoPontosMaximos,
        QuestaoExplicacao: resolvida ? questao.QuestaoExplicacao : null,
        QuestaoOrdem: questao.QuestaoOrdem,
        Alternativas: alternativas.map((a) => ({
          AlternativaGUID: a.AlternativaGUID,
          AlternativaTexto: a.AlternativaTexto,
          AlternativaOrdem: a.AlternativaOrdem,
          AlternativaCorreta: respondida ? a.AlternativaCorreta : null,
          AlternativaPontos: respondida ? a.AlternativaPontos : null,
        })),
        Anexos: anexos.map((a) => ({
          AnexoGUID: a.AnexoGUID,
          AnexoNomeOriginal: a.AnexoNomeOriginal,
          AnexoTamanho: a.AnexoTamanho,
          CreatedAt: a.CreatedAt ? new Date(a.CreatedAt).toISOString() : null,
        })),
        MinhaResposta: resposta
          ? {
              RespostaGUID: resposta.RespostaGUID,
              AlternativaGUID: resposta.AlternativaGUID,
              RespostaTextoDiscursiva: resposta.RespostaTextoDiscursiva,
              RespostaPontosObtidos: resposta.RespostaPontosObtidos,
              Corrigida: corrigida,
            }
          : null,
      };
    });
  };

  // ========== Correção do professor (tarefa "lista") ==========

  /**
   * Painel de correção do professor: todas as questões da tarefa + a
   * resposta de UM aluno específico (TarefaMatriculaGUID) em cada uma —
   * gabarito sempre completo (o professor não passa pela máscara que o
   * aluno vê antes de responder).
   */
  buscarRespostasAluno = async (
    TarefaGUID: string,
    TarefaMatriculaGUID: string,
    professorCPF: string
  ): Promise<QuestaoComRespostaProfessorDTO[]> => {
    console.log("🟣 TarefaAcademicaService.buscarRespostasAluno()");

    await this.#validarTarefaListaDoProfessor(TarefaGUID, professorCPF);

    const atribuicoes = await this.#tarefaMatriculaDAO.findByTarefa(TarefaGUID);
    const atribuicao = atribuicoes.find((a) => a.TarefaMatriculaGUID === TarefaMatriculaGUID);
    if (!atribuicao) {
      throw new ErrorResponse(404, "Atribuição não encontrada", {
        message: `A matrícula ${TarefaMatriculaGUID} não pertence a esta tarefa.`,
      });
    }

    const questoes = await this.#questaoDAO.findByTarefa(TarefaGUID);
    if (questoes.length === 0) return [];

    const questaoGUIDs = questoes.map((q) => q.QuestaoGUID);
    const alternativasPorQuestao = await this.#alternativaDAO.findByQuestoes(questaoGUIDs);
    const anexosPorQuestao = await this.#questaoDAO.buscarAnexosPorQuestoes(questaoGUIDs);
    const respostas = await this.#respostaDAO.findByMatricula(TarefaMatriculaGUID);
    const respostaPorQuestao = new Map(respostas.map((r) => [r.QuestaoGUID, r]));

    return questoes.map((questao) => {
      const resposta = respostaPorQuestao.get(questao.QuestaoGUID) ?? null;
      return {
        QuestaoGUID: questao.QuestaoGUID,
        QuestaoEnunciado: questao.QuestaoEnunciado,
        QuestaoTipo: questao.QuestaoTipo,
        QuestaoPontosMaximos: questao.QuestaoPontosMaximos,
        QuestaoExplicacao: questao.QuestaoExplicacao,
        QuestaoOrdem: questao.QuestaoOrdem,
        Alternativas: (alternativasPorQuestao.get(questao.QuestaoGUID) ?? []).map((a) => ({
          AlternativaGUID: a.AlternativaGUID,
          AlternativaTexto: a.AlternativaTexto,
          AlternativaCorreta: a.AlternativaCorreta,
          AlternativaPontos: a.AlternativaPontos,
          AlternativaOrdem: a.AlternativaOrdem,
        })),
        Anexos: (anexosPorQuestao.get(questao.QuestaoGUID) ?? []).map((a) => ({
          AnexoGUID: a.AnexoGUID,
          AnexoNomeOriginal: a.AnexoNomeOriginal,
          AnexoTamanho: a.AnexoTamanho,
          CreatedAt: a.CreatedAt ? new Date(a.CreatedAt).toISOString() : null,
        })),
        Resposta: resposta
          ? {
              RespostaGUID: resposta.RespostaGUID,
              AlternativaGUID: resposta.AlternativaGUID,
              RespostaTextoDiscursiva: resposta.RespostaTextoDiscursiva,
              RespostaPontosObtidos: resposta.RespostaPontosObtidos,
              RespostaAvaliadoPorCPF: resposta.RespostaAvaliadoPorCPF,
              RespondidoEm: resposta.RespondidoEm ? resposta.RespondidoEm.toISOString() : null,
            }
          : null,
      };
    });
  };

  /**
   * Professor corrige uma resposta discursiva (pontos por questão) — só
   * exige que a questão tenha sido respondida, NÃO exige TarefaFeito=true da
   * tarefa inteira (o professor pode corrigir discursivas de quem ainda não
   * terminou a lista).
   */
  avaliarQuestaoDiscursiva = async (RespostaGUID: string, pontos: number, professorCPF: string): Promise<RespostaDTO> => {
    console.log("🟣 TarefaAcademicaService.avaliarQuestaoDiscursiva()");

    const resposta = await this.#respostaDAO.findById(RespostaGUID);
    if (!resposta) {
      throw new ErrorResponse(404, "Resposta não encontrada", {
        message: `Não existe resposta com id ${RespostaGUID}`,
      });
    }
    if (resposta.RespostaTextoDiscursiva === null) {
      throw new ErrorResponse(400, "Operação inválida", {
        message: "Esta resposta não é de uma questão discursiva.",
      });
    }

    const questao = await this.#questaoDAO.findById(resposta.QuestaoGUID);
    if (!questao) {
      throw new ErrorResponse(404, "Questão não encontrada", {
        message: `Não existe questão com id ${resposta.QuestaoGUID}`,
      });
    }
    await this.#validarTarefaListaDoProfessor(questao.TarefaGUID, professorCPF);

    if (pontos < 0 || pontos > questao.QuestaoPontosMaximos) {
      throw new ErrorResponse(400, "Pontos inválidos", {
        message: `Pontos deve ser um número entre 0 e ${questao.QuestaoPontosMaximos} (máximo desta questão).`,
      });
    }

    const atualizada = await this.#respostaDAO.gradeDiscursiva(RespostaGUID, pontos, professorCPF);
    if (!atualizada) {
      throw new ErrorResponse(500, "Erro ao corrigir resposta");
    }

    await this.#tentarSettleTarefaLista(resposta.TarefaMatriculaGUID);

    return this.#mapRespostaParaDTO(atualizada);
  };
}
