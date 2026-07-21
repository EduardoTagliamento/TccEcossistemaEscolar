import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse";
import EscolaConfiguracao from "../entities/escolaconfiguracao.model";
import EscolaConfiguracaoIntervalo from "../entities/escolaconfiguracaointervalo.model";
import { EscolaConfiguracaoDAO } from "../repositories/escolaconfiguracao.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import {
  DiaSemana,
  SlotAula,
  calcularAvisoIntervalo,
  calcularSlotsPeriodo,
  horaParaMinutos,
} from "../utils/gradeHoraria.util";
import { getAuditoriaService } from "./auditoria.service";

export interface IntervaloDTO {
  DiaSemana: DiaSemana | null;
  IntervaloInicio: string;
  IntervaloFim: string;
}

export interface EscolaConfiguracaoDTO {
  EscolaConfiguracaoGUID: string;
  EscolaGUID: string;
  MinutosPorAula: number;
  DiasSemana: DiaSemana[];
  PeriodoManhaInicio: string;
  PeriodoManhaFim: string;
  TemAulaTarde: boolean;
  PeriodoTardeInicio: string | null;
  PeriodoTardeFim: string | null;
  IntervaloVariado: boolean;
  Intervalos: IntervaloDTO[];
  Configurada: boolean;
  CreatedAt: string | null;
  UpdatedAt: string | null;
}

export interface EscolaConfiguracaoSalvarDTO {
  MinutosPorAula: number;
  DiasSemana: DiaSemana[];
  PeriodoManhaInicio: string;
  PeriodoManhaFim: string;
  TemAulaTarde: boolean;
  PeriodoTardeInicio?: string | null;
  PeriodoTardeFim?: string | null;
  IntervaloVariado: boolean;
  Intervalos: IntervaloDTO[];
}

export interface SlotsPorDiaDTO {
  DiaSemana: DiaSemana;
  Manha: SlotAula[];
  Tarde: SlotAula[];
}

const PADRAO_DIAS_SEMANA: DiaSemana[] = ["Segunda", "Terca", "Quarta", "Quinta", "Sexta"];

export default class EscolaConfiguracaoService {
  #escolaConfiguracaoDAO: EscolaConfiguracaoDAO;
  #escolaDAO: EscolaDAO;
  #escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    escolaConfiguracaoDAO: EscolaConfiguracaoDAO,
    escolaDAO: EscolaDAO,
    escolaxusuarioxfuncaoDAO: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("⬆️  EscolaConfiguracaoService.constructor()");
    this.#escolaConfiguracaoDAO = escolaConfiguracaoDAO;
    this.#escolaDAO = escolaDAO;
    this.#escolaxusuarioxfuncaoDAO = escolaxusuarioxfuncaoDAO;
  }

  obterConfiguracao = async (escolaGUID: string): Promise<EscolaConfiguracaoDTO> => {
    console.log("🟣 EscolaConfiguracaoService.obterConfiguracao()");

    const escola = await this.#escolaDAO.findById(escolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${escolaGUID}`,
      });
    }

    const config = await this.#escolaConfiguracaoDAO.findByEscola(escolaGUID);

    if (!config) {
      return this.toDTORascunho(escolaGUID);
    }

    const intervalos = await this.#escolaConfiguracaoDAO.findIntervalosByConfiguracao(
      config.EscolaConfiguracaoGUID
    );

    return this.toDTO(config, intervalos);
  };

  salvarConfiguracao = async (
    escolaGUID: string,
    data: EscolaConfiguracaoSalvarDTO,
    usuarioCPF: string
  ): Promise<{ configuracao: EscolaConfiguracaoDTO; avisos: string[] }> => {
    console.log("🟣 EscolaConfiguracaoService.salvarConfiguracao()");

    const escola = await this.#escolaDAO.findById(escolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${escolaGUID}`,
      });
    }

    await this.validarPermissaoEscrita(usuarioCPF, escolaGUID);

    const existente = await this.#escolaConfiguracaoDAO.findByEscola(escolaGUID);

    const config = new EscolaConfiguracao();
    config.EscolaConfiguracaoGUID = existente?.EscolaConfiguracaoGUID || uuidv4();
    config.EscolaGUID = escolaGUID;
    config.MinutosPorAula = data.MinutosPorAula;
    config.DiasSemana = data.DiasSemana;
    config.PeriodoManhaInicio = data.PeriodoManhaInicio;
    config.PeriodoManhaFim = data.PeriodoManhaFim;
    config.TemAulaTarde = data.TemAulaTarde;
    config.PeriodoTardeInicio = data.TemAulaTarde ? data.PeriodoTardeInicio || null : null;
    config.PeriodoTardeFim = data.TemAulaTarde ? data.PeriodoTardeFim || null : null;
    config.IntervaloVariado = data.IntervaloVariado;

    config.validarConsistencia();

    const { intervalos, avisos } = this.prepararIntervalos(config, data.Intervalos || []);

    if (existente) {
      await this.#escolaConfiguracaoDAO.update(config);
    } else {
      await this.#escolaConfiguracaoDAO.create(config);
    }

    await this.#escolaConfiguracaoDAO.replaceIntervalos(config.EscolaConfiguracaoGUID, intervalos);

    const configuracaoSalva = await this.#escolaConfiguracaoDAO.findByEscola(escolaGUID);
    const intervalosSalvos = await this.#escolaConfiguracaoDAO.findIntervalosByConfiguracao(
      config.EscolaConfiguracaoGUID
    );

    void getAuditoriaService().registrar({
      EscolaGUID: escolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: existente ? "Update" : "Create",
      EntidadeTipo: "escolaconfiguracao",
      EntidadeGUID: config.EscolaConfiguracaoGUID,
      CategoriaAuditoriaId: 2,
    });

    return {
      configuracao: this.toDTO(configuracaoSalva!, intervalosSalvos),
      avisos,
    };
  };

  obterSlots = async (escolaGUID: string): Promise<SlotsPorDiaDTO[]> => {
    console.log("🟣 EscolaConfiguracaoService.obterSlots()");

    const escola = await this.#escolaDAO.findById(escolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada", {
        message: `Não existe escola com id ${escolaGUID}`,
      });
    }

    const config = await this.#escolaConfiguracaoDAO.findByEscola(escolaGUID);
    if (!config) {
      throw new ErrorResponse(400, "Escola sem configuração de horário", {
        message: "Configure os horários da escola antes de montar o cronograma de uma turma.",
      });
    }

    const intervalos = await this.#escolaConfiguracaoDAO.findIntervalosByConfiguracao(
      config.EscolaConfiguracaoGUID
    );

    return config.DiasSemana.map((dia) => {
      const intervalosDoDia = config.IntervaloVariado
        ? intervalos.filter((i) => i.DiaSemana === dia)
        : intervalos.filter((i) => i.DiaSemana === null);

      const manha = calcularSlotsPeriodo(
        config.PeriodoManhaInicio!,
        config.PeriodoManhaFim!,
        config.MinutosPorAula,
        intervalosDoDia
      );

      const tarde =
        config.TemAulaTarde && config.PeriodoTardeInicio && config.PeriodoTardeFim
          ? calcularSlotsPeriodo(
              config.PeriodoTardeInicio,
              config.PeriodoTardeFim,
              config.MinutosPorAula,
              intervalosDoDia
            )
          : [];

      return { DiaSemana: dia, Manha: manha, Tarde: tarde };
    });
  };

  /**
   * Valida cada intervalo recebido, normaliza DiaSemana conforme
   * IntervaloVariado e calcula avisos não-bloqueantes de aula cortada.
   */
  private prepararIntervalos(
    config: EscolaConfiguracao,
    intervalosData: IntervaloDTO[]
  ): { intervalos: EscolaConfiguracaoIntervalo[]; avisos: string[] } {
    const avisos: string[] = [];
    const intervalos: EscolaConfiguracaoIntervalo[] = [];

    for (const dadosIntervalo of intervalosData) {
      const intervalo = new EscolaConfiguracaoIntervalo();
      intervalo.EscolaConfiguracaoIntervaloGUID = uuidv4();
      intervalo.EscolaConfiguracaoGUID = config.EscolaConfiguracaoGUID;
      intervalo.IntervaloInicio = dadosIntervalo.IntervaloInicio;
      intervalo.IntervaloFim = dadosIntervalo.IntervaloFim;

      if (config.IntervaloVariado) {
        if (!dadosIntervalo.DiaSemana) {
          throw new ErrorResponse(400, "DiaSemana obrigatório", {
            message: "Com intervalo variado, cada intervalo precisa informar o dia da semana.",
          });
        }
        if (!config.DiasSemana.includes(dadosIntervalo.DiaSemana)) {
          throw new ErrorResponse(400, "DiaSemana inválido", {
            message: `O dia "${dadosIntervalo.DiaSemana}" não está entre os dias letivos configurados.`,
          });
        }
        intervalo.DiaSemana = dadosIntervalo.DiaSemana;
      } else {
        intervalo.DiaSemana = null;
      }

      intervalo.validar();

      const periodoBase = this.periodoBaseDoIntervalo(config, intervalo);
      if (!periodoBase) {
        throw new ErrorResponse(400, "Intervalo fora do expediente", {
          message: `O intervalo ${intervalo.IntervaloInicio}-${intervalo.IntervaloFim} não está contido no período da manhã nem no da tarde configurados.`,
        });
      }

      const aviso = calcularAvisoIntervalo(
        periodoBase,
        config.MinutosPorAula,
        intervalo.IntervaloInicio
      );
      if (aviso) {
        avisos.push(aviso.mensagem);
      }

      intervalos.push(intervalo);
    }

    return { intervalos, avisos };
  }

  /**
   * Retorna o horário de início do período (manhã ou tarde) em que o
   * intervalo está contido, ou null se não estiver em nenhum dos dois.
   */
  private periodoBaseDoIntervalo(
    config: EscolaConfiguracao,
    intervalo: EscolaConfiguracaoIntervalo
  ): string | null {
    const inicioMin = horaParaMinutos(intervalo.IntervaloInicio);
    const fimMin = horaParaMinutos(intervalo.IntervaloFim);

    const manhaInicioMin = horaParaMinutos(config.PeriodoManhaInicio!);
    const manhaFimMin = horaParaMinutos(config.PeriodoManhaFim!);
    if (inicioMin >= manhaInicioMin && fimMin <= manhaFimMin) {
      return config.PeriodoManhaInicio;
    }

    if (config.TemAulaTarde && config.PeriodoTardeInicio && config.PeriodoTardeFim) {
      const tardeInicioMin = horaParaMinutos(config.PeriodoTardeInicio);
      const tardeFimMin = horaParaMinutos(config.PeriodoTardeFim);
      if (inicioMin >= tardeInicioMin && fimMin <= tardeFimMin) {
        return config.PeriodoTardeInicio;
      }
    }

    return null;
  }

  private async validarPermissaoEscrita(cpf: string, escolaGUID: string): Promise<void> {
    console.log("🔒 EscolaConfiguracaoService.validarPermissaoEscrita()");

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
        "Você não tem permissão para realizar esta operação. Apenas Coordenação e Direção podem gerenciar as configurações da escola.",
    });
  }

  private toDTO(
    config: EscolaConfiguracao,
    intervalos: EscolaConfiguracaoIntervalo[]
  ): EscolaConfiguracaoDTO {
    return {
      EscolaConfiguracaoGUID: config.EscolaConfiguracaoGUID,
      EscolaGUID: config.EscolaGUID,
      MinutosPorAula: config.MinutosPorAula,
      DiasSemana: config.DiasSemana,
      PeriodoManhaInicio: config.PeriodoManhaInicio || "",
      PeriodoManhaFim: config.PeriodoManhaFim || "",
      TemAulaTarde: config.TemAulaTarde,
      PeriodoTardeInicio: config.PeriodoTardeInicio,
      PeriodoTardeFim: config.PeriodoTardeFim,
      IntervaloVariado: config.IntervaloVariado,
      Intervalos: intervalos.map((intervalo) => ({
        DiaSemana: intervalo.DiaSemana,
        IntervaloInicio: intervalo.IntervaloInicio,
        IntervaloFim: intervalo.IntervaloFim,
      })),
      Configurada: true,
      CreatedAt: config.CreatedAt ? config.CreatedAt.toISOString() : null,
      UpdatedAt: config.UpdatedAt ? config.UpdatedAt.toISOString() : null,
    };
  }

  private toDTORascunho(escolaGUID: string): EscolaConfiguracaoDTO {
    return {
      EscolaConfiguracaoGUID: "",
      EscolaGUID: escolaGUID,
      MinutosPorAula: 50,
      DiasSemana: PADRAO_DIAS_SEMANA,
      PeriodoManhaInicio: "07:00",
      PeriodoManhaFim: "12:20",
      TemAulaTarde: false,
      PeriodoTardeInicio: null,
      PeriodoTardeFim: null,
      IntervaloVariado: false,
      Intervalos: [],
      Configurada: false,
      CreatedAt: null,
      UpdatedAt: null,
    };
  }
}
