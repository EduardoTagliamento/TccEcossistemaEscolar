import ErrorResponse from "../utils/ErrorResponse";
import TarefaAcademicaService, { QuestaoCreateDTO, TarefaAcademicaDTO } from "./tarefaacademica.service";
import QuestaoBancoService from "./questaobanco.service";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
import { MatriculaDAO } from "../repositories/matricula.repository";

/**
 * Orquestra a criação de um simulado atribuído a uma turma — ver
 * docs/SPEC_SIMULADOS_BANCO_QUESTOES.md, item 1 (Caso B) e item 4.2.
 *
 * Não é uma entidade nova: um "simulado atribuído" É uma `TarefaAcademica`
 * (TarefaTipoEntrega='lista', o quiz estilo Forms que já existe), cujas
 * questões são CÓPIAS das questões escolhidas no Banco de Questões — não
 * referências. Por isso fica num service fino à parte, só compondo
 * `TarefaAcademicaService` (criarTarefa + criarQuestoesBatch, ambos já
 * existentes e usados pelo construtor manual do TarefaForm) com
 * `QuestaoBancoService` (busca+valida as questões escolhidas), em vez de
 * inchar mais o `tarefaacademica.service.ts` (já ~2300 linhas).
 */

const TOTAL_PONTOS_PADRAO = 10;

export default class SimuladoTarefaService {
  #tarefaService: TarefaAcademicaService;
  #questaoBancoService: QuestaoBancoService;
  #matProfTurDAO: MaterialProfessorTurmaDAO;
  #matriculaDAO: MatriculaDAO;

  constructor(
    tarefaService: TarefaAcademicaService,
    questaoBancoService: QuestaoBancoService,
    matProfTurDAO: MaterialProfessorTurmaDAO,
    matriculaDAO: MatriculaDAO
  ) {
    console.log("⬆️  SimuladoTarefaService.constructor()");
    this.#tarefaService = tarefaService;
    this.#questaoBancoService = questaoBancoService;
    this.#matProfTurDAO = matProfTurDAO;
    this.#matriculaDAO = matriculaDAO;
  }

  criarSimuladoComoTarefa = async (
    dados: {
      matXprofXturxescGUID: string;
      QuestaoBancoGUIDs: string[];
      TarefaTitulo: string;
      TarefaPrazoData: Date;
    },
    professorGUID: string
  ): Promise<TarefaAcademicaDTO> => {
    console.log("🟣 SimuladoTarefaService.criarSimuladoComoTarefa()");

    if (dados.QuestaoBancoGUIDs.length === 0 || dados.QuestaoBancoGUIDs.length > 50) {
      throw new ErrorResponse(400, "Lista de questões inválida", {
        message: "Informe entre 1 e 50 questões.",
      });
    }

    const alocacao = await this.#matProfTurDAO.findById(dados.matXprofXturxescGUID);
    if (!alocacao || alocacao.AlocacaoStatus !== "Ativa") {
      throw new ErrorResponse(404, "Alocação não encontrada", {
        message: "Esta alocação de matéria+turma não existe ou não está ativa.",
      });
    }
    if (alocacao.UsuarioGUID !== professorGUID) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode criar simulados nas suas próprias turmas.",
      });
    }
    if (!alocacao.TurmaGUID) {
      throw new ErrorResponse(400, "Alocação sem turma", {
        message: "Esta alocação é de grupo eletivo — atribuição de simulado por turma ainda não é suportada aqui.",
      });
    }

    const matriculas = await this.#matriculaDAO.findByTurma(alocacao.TurmaGUID);
    const matriculasAtivas = matriculas.filter((m) => m.MatriculaStatus === "Ativa");
    if (matriculasAtivas.length === 0) {
      throw new ErrorResponse(400, "Turma sem alunos", {
        message: "Esta turma não tem nenhuma matrícula ativa pra receber o simulado.",
      });
    }

    // Preserva a ordem escolhida na composição (QuestaoBancoGUIDs já vem na ordem final —
    // randomizada ou aceita no Tinder) — buscarVariasValidadas não garante ordem.
    const questoesEncontradas = await this.#questaoBancoService.buscarVariasValidadas(dados.QuestaoBancoGUIDs);
    const porGUID = new Map(questoesEncontradas.map((q) => [q.QuestaoBancoGUID, q]));
    const questoesOrdenadas = dados.QuestaoBancoGUIDs.map((g) => porGUID.get(g)!);

    const tarefa = await this.#tarefaService.criarTarefa(
      {
        MatriculasGUID: matriculasAtivas.map((m) => m.MatriculaGUID),
        matXprofXturxescGUID: dados.matXprofXturxescGUID,
        TarefaTitulo: dados.TarefaTitulo,
        TarefaConteudo: "Simulado gerado a partir do Banco de Questões.",
        TarefaPrazoData: dados.TarefaPrazoData,
        TarefaTipoEntrega: "lista",
      },
      professorGUID
    );

    const pontosPorQuestao = TOTAL_PONTOS_PADRAO / questoesOrdenadas.length;
    const questoesParaCopiar: QuestaoCreateDTO[] = questoesOrdenadas.map((questao) => ({
      QuestaoEnunciado: questao.Enunciado,
      QuestaoTipo: "objetiva",
      QuestaoPontosMaximos: pontosPorQuestao,
      Alternativas: [...questao.Alternativas]
        .sort((a, b) => a.AlternativaOrdem - b.AlternativaOrdem)
        .map((alt) => ({
          AlternativaTexto: alt.AlternativaTexto,
          AlternativaCorreta: alt.AlternativaCorreta,
          AlternativaPontos: alt.AlternativaCorreta ? pontosPorQuestao : 0,
        })),
    }));

    await this.#tarefaService.criarQuestoesBatch(tarefa.TarefaGUID, questoesParaCopiar, professorGUID);

    return this.#tarefaService.buscarTarefa(tarefa.TarefaGUID);
  };
}
