import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse";
import HorarioTurma from "../entities/horarioturma.model";
import { HorarioTurmaDAO } from "../repositories/horarioturma.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { EscolaConfiguracaoDAO } from "../repositories/escolaconfiguracao.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { DiaSemana, calcularDataAulaNaSemana } from "../utils/gradeHoraria.util";

export interface HorarioTurmaDTO {
  HorarioTurmaGUID: string;
  TurmaGUID: string;
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  UsuarioCPF: string;
  UsuarioNome: string;
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
}

export interface BancoItemDTO {
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  UsuarioCPF: string;
  UsuarioNome: string;
  AulasPorSemana: number | null;
  AulasAlocadas: number;
  AulasRestantes: number | null;
}

export interface CronogramaTurmaDTO {
  TurmaGUID: string;
  Slots: HorarioTurmaDTO[];
  Banco: BancoItemDTO[];
}

export interface AlocarSlotDTO {
  MatProfTurGUID: string;
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
}

export interface EscolhaCalculoDTO {
  TurmaGUID: string;
  /** Qualquer data (YYYY-MM-DD) dentro da semana desejada */
  SemanaBase: string;
  /** Obrigatório apenas quando a matéria tem mais de uma ocorrência semanal nesta turma */
  DiaSemana?: DiaSemana;
  DeslocamentoMinutos?: number;
}

export interface OcorrenciaCalculoDTO {
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
}

export interface ResultadoCalculoDTO {
  TurmaGUID: string;
  status: "ok" | "semCronograma" | "escolherDia" | "erro";
  DataCalculada?: string;
  DiaSemana?: DiaSemana;
  HoraBase?: string;
  Ocorrencias?: OcorrenciaCalculoDTO[];
  mensagem?: string;
}

export default class HorarioTurmaService {
  #horarioTurmaDAO: HorarioTurmaDAO;
  #turmaDAO: TurmaDAO;
  #matProfTurDAO: MaterialProfessorTurmaDAO;
  #materiaDAO: MateriaDAO;
  #usuarioDAO: UsuarioDAO;
  #escolaConfiguracaoDAO: EscolaConfiguracaoDAO;
  #escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    horarioTurmaDAO: HorarioTurmaDAO,
    turmaDAO: TurmaDAO,
    matProfTurDAO: MaterialProfessorTurmaDAO,
    materiaDAO: MateriaDAO,
    usuarioDAO: UsuarioDAO,
    escolaConfiguracaoDAO: EscolaConfiguracaoDAO,
    escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("⬆️  HorarioTurmaService.constructor()");
    this.#horarioTurmaDAO = horarioTurmaDAO;
    this.#turmaDAO = turmaDAO;
    this.#matProfTurDAO = matProfTurDAO;
    this.#materiaDAO = materiaDAO;
    this.#usuarioDAO = usuarioDAO;
    this.#escolaConfiguracaoDAO = escolaConfiguracaoDAO;
    this.#escolaxusuarioxfuncaoDAO = escolaxusuarioxfuncaoDAO;
  }

  obterCronograma = async (turmaGUID: string): Promise<CronogramaTurmaDTO> => {
    console.log("🟣 HorarioTurmaService.obterCronograma()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", {
        message: `Não existe turma com id ${turmaGUID}`,
      });
    }

    const slotsDetalhados = await this.#horarioTurmaDAO.findDetalhadoByTurma(turmaGUID);
    const slots: HorarioTurmaDTO[] = slotsDetalhados.map((s) => ({
      HorarioTurmaGUID: s.HorarioTurmaGUID,
      TurmaGUID: s.TurmaGUID,
      MatProfTurGUID: s.MatProfTurGUID,
      MateriaGUID: s.MateriaGUID,
      MateriaNome: s.MateriaNome,
      UsuarioCPF: s.UsuarioCPF,
      UsuarioNome: s.UsuarioNome,
      DiaSemana: s.DiaSemana,
      HoraInicio: s.HoraInicio,
      HoraFim: s.HoraFim,
    }));

    const alocacoes = await this.#matProfTurDAO.findAll({
      TurmaGUID: turmaGUID,
      AlocacaoStatus: "Ativa",
    });

    const banco: BancoItemDTO[] = [];
    for (const alocacao of alocacoes) {
      const materia = await this.#materiaDAO.findById(alocacao.MateriaGUID);
      const usuario = await this.#usuarioDAO.findById(alocacao.UsuarioCPF);

      const aulasPorSemana = alocacao.AulasPorSemana ?? materia?.MateriaAulasPorSemanaPadrao ?? null;
      const aulasAlocadas = slots.filter((s) => s.MatProfTurGUID === alocacao.MatProfTurGUID).length;

      banco.push({
        MatProfTurGUID: alocacao.MatProfTurGUID,
        MateriaGUID: alocacao.MateriaGUID,
        MateriaNome: materia?.MateriaNome || "",
        UsuarioCPF: alocacao.UsuarioCPF,
        UsuarioNome: usuario?.UsuarioNome || "",
        AulasPorSemana: aulasPorSemana,
        AulasAlocadas: aulasAlocadas,
        AulasRestantes: aulasPorSemana !== null ? Math.max(0, aulasPorSemana - aulasAlocadas) : null,
      });
    }

    return { TurmaGUID: turmaGUID, Slots: slots, Banco: banco };
  };

  /**
   * Calcula, para cada turma escolhida, a data/hora em que uma matéria
   * ocorre no cronograma daquela turma numa determinada semana (+/-
   * deslocamento). Usado pelo "definir automaticamente" de Prova/Tarefa.
   *
   * Por turma, três desfechos possíveis:
   * - "semCronograma": a matéria não está alocada no cronograma desta
   *   turma (turma sem grade, ou matéria não posicionada ainda).
   * - "escolherDia": a matéria ocorre mais de uma vez por semana nesta
   *   turma e nenhum DiaSemana foi informado — o chamador deve perguntar
   *   ao usuário qual ocorrência usar como base.
   * - "ok": data calculada com sucesso.
   */
  calcularDatas = async (
    materiaGUID: string,
    escolhas: EscolhaCalculoDTO[]
  ): Promise<ResultadoCalculoDTO[]> => {
    console.log("🟣 HorarioTurmaService.calcularDatas()");

    const resultados: ResultadoCalculoDTO[] = [];

    for (const escolha of escolhas) {
      const turma = await this.#turmaDAO.findById(escolha.TurmaGUID);
      if (!turma) {
        resultados.push({
          TurmaGUID: escolha.TurmaGUID,
          status: "erro",
          mensagem: "Turma não encontrada.",
        });
        continue;
      }

      const slotsDetalhados = await this.#horarioTurmaDAO.findDetalhadoByTurma(escolha.TurmaGUID);
      const ocorrencias = slotsDetalhados.filter((s) => s.MateriaGUID === materiaGUID);

      if (ocorrencias.length === 0) {
        resultados.push({ TurmaGUID: escolha.TurmaGUID, status: "semCronograma" });
        continue;
      }

      let ocorrenciaEscolhida = ocorrencias[0];
      if (ocorrencias.length > 1) {
        if (!escolha.DiaSemana) {
          resultados.push({
            TurmaGUID: escolha.TurmaGUID,
            status: "escolherDia",
            Ocorrencias: ocorrencias.map((o) => ({
              DiaSemana: o.DiaSemana,
              HoraInicio: o.HoraInicio,
              HoraFim: o.HoraFim,
            })),
          });
          continue;
        }

        const encontrada = ocorrencias.find((o) => o.DiaSemana === escolha.DiaSemana);
        if (!encontrada) {
          resultados.push({
            TurmaGUID: escolha.TurmaGUID,
            status: "erro",
            mensagem: `O dia "${escolha.DiaSemana}" não corresponde a nenhuma ocorrência desta matéria nesta turma.`,
          });
          continue;
        }
        ocorrenciaEscolhida = encontrada;
      }

      try {
        const dataCalculada = calcularDataAulaNaSemana(
          escolha.SemanaBase,
          ocorrenciaEscolhida.DiaSemana,
          ocorrenciaEscolhida.HoraInicio,
          escolha.DeslocamentoMinutos || 0
        );

        resultados.push({
          TurmaGUID: escolha.TurmaGUID,
          status: "ok",
          DataCalculada: dataCalculada,
          DiaSemana: ocorrenciaEscolhida.DiaSemana,
          HoraBase: ocorrenciaEscolhida.HoraInicio,
        });
      } catch (error) {
        resultados.push({
          TurmaGUID: escolha.TurmaGUID,
          status: "erro",
          mensagem: error instanceof Error ? error.message : "Erro ao calcular a data.",
        });
      }
    }

    return resultados;
  };

  alocarSlot = async (
    turmaGUID: string,
    data: AlocarSlotDTO,
    usuarioCPF: string
  ): Promise<HorarioTurmaDTO> => {
    console.log("🟣 HorarioTurmaService.alocarSlot()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", {
        message: `Não existe turma com id ${turmaGUID}`,
      });
    }

    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    const alocacao = await this.#matProfTurDAO.findById(data.MatProfTurGUID);
    if (!alocacao || alocacao.TurmaGUID !== turmaGUID || alocacao.AlocacaoStatus !== "Ativa") {
      throw new ErrorResponse(400, "Alocação inválida", {
        message: "Esta matéria+professor não está alocada (ativa) nesta turma.",
      });
    }

    const config = await this.#escolaConfiguracaoDAO.findByEscola(turma.EscolaGUID);
    if (!config) {
      throw new ErrorResponse(400, "Escola sem configuração de horário", {
        message: "Configure os horários da escola antes de montar o cronograma da turma.",
      });
    }
    if (!config.DiasSemana.includes(data.DiaSemana)) {
      throw new ErrorResponse(400, "Dia não letivo", {
        message: `"${data.DiaSemana}" não está entre os dias letivos configurados para esta escola.`,
      });
    }

    const materia = await this.#materiaDAO.findById(alocacao.MateriaGUID);
    const aulasPorSemana = alocacao.AulasPorSemana ?? materia?.MateriaAulasPorSemanaPadrao ?? null;
    if (aulasPorSemana === null) {
      throw new ErrorResponse(400, "Aulas por semana não configuradas", {
        message:
          "Defina quantas aulas por semana esta matéria tem (no cadastro da matéria ou na alocação desta turma) antes de montar o cronograma.",
      });
    }

    const aulasAlocadas = await this.#horarioTurmaDAO.countByMatProfTur(data.MatProfTurGUID);
    if (aulasAlocadas >= aulasPorSemana) {
      throw new ErrorResponse(409, "Limite de aulas semanais atingido", {
        message: "Todas as aulas semanais desta matéria já foram alocadas nesta turma.",
      });
    }

    const slotExistente = await this.#horarioTurmaDAO.findByTurmaDiaHora(
      turmaGUID,
      data.DiaSemana,
      data.HoraInicio
    );
    if (slotExistente) {
      throw new ErrorResponse(409, "Horário ocupado", {
        message: "Já existe uma matéria alocada neste horário para esta turma.",
      });
    }

    const professor = await this.#usuarioDAO.findById(alocacao.UsuarioCPF);

    const conflito = await this.#horarioTurmaDAO.findConflitoProfessor(
      alocacao.UsuarioCPF,
      data.DiaSemana,
      data.HoraInicio,
      data.HoraFim,
      turmaGUID
    );
    if (conflito) {
      throw new ErrorResponse(409, "Conflito de horário do professor", {
        message: `${professor?.UsuarioNome || "O professor"} já leciona ${conflito.MateriaNome} na turma ${conflito.TurmaSerie} ${conflito.TurmaNome} às ${conflito.HoraInicio}-${conflito.HoraFim} de ${conflito.DiaSemana}.`,
        conflito,
      });
    }

    const horario = new HorarioTurma();
    horario.HorarioTurmaGUID = uuidv4();
    horario.TurmaGUID = turmaGUID;
    horario.MatProfTurGUID = data.MatProfTurGUID;
    horario.DiaSemana = data.DiaSemana;
    horario.HoraInicio = data.HoraInicio;
    horario.HoraFim = data.HoraFim;
    horario.validar();

    await this.#horarioTurmaDAO.create(horario);

    return {
      HorarioTurmaGUID: horario.HorarioTurmaGUID,
      TurmaGUID: turmaGUID,
      MatProfTurGUID: alocacao.MatProfTurGUID,
      MateriaGUID: alocacao.MateriaGUID,
      MateriaNome: materia?.MateriaNome || "",
      UsuarioCPF: alocacao.UsuarioCPF,
      UsuarioNome: professor?.UsuarioNome || "",
      DiaSemana: data.DiaSemana,
      HoraInicio: data.HoraInicio,
      HoraFim: data.HoraFim,
    };
  };

  removerSlot = async (
    turmaGUID: string,
    horarioTurmaGUID: string,
    usuarioCPF: string
  ): Promise<void> => {
    console.log("🟣 HorarioTurmaService.removerSlot()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", {
        message: `Não existe turma com id ${turmaGUID}`,
      });
    }

    await this.validarPermissaoEscrita(usuarioCPF, turma.EscolaGUID);

    const horario = await this.#horarioTurmaDAO.findById(horarioTurmaGUID);
    if (!horario || horario.TurmaGUID !== turmaGUID) {
      throw new ErrorResponse(404, "Slot não encontrado", {
        message: "Este horário não existe no cronograma desta turma.",
      });
    }

    await this.#horarioTurmaDAO.delete(horarioTurmaGUID);
  };

  private async validarPermissaoEscrita(cpf: string, escolaGUID: string): Promise<void> {
    console.log("🔒 HorarioTurmaService.validarPermissaoEscrita()");

    const coordenacao = await this.#escolaxusuarioxfuncaoDAO.findByTripla(cpf, escolaGUID, 1);
    if (coordenacao && coordenacao.Status === "Ativo") {
      return;
    }

    const direcao = await this.#escolaxusuarioxfuncaoDAO.findByTripla(cpf, escolaGUID, 6);
    if (direcao && direcao.Status === "Ativo") {
      return;
    }

    throw new ErrorResponse(403, "Sem permissão", {
      message:
        "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar o cronograma da turma.",
    });
  }
}
