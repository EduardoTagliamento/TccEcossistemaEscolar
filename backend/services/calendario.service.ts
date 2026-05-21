import {
  CalendarioAviso,
  CalendarioFilters,
  CalendarioTipoAviso,
} from "../entities/calendario.model";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import { CalendarioDAO } from "../repositories/calendario.repository";
import ErrorResponse from "../utils/ErrorResponse";

export default class CalendarioService {
  #calendarioDAO: CalendarioDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(
    calendarioDAODependency: CalendarioDAO,
    escolaxUsuarioxFuncaoDAODependency: EscolaxUsuarioxFuncaoDAO
  ) {
    console.log("⬆️  CalendarioService.constructor()");
    this.#calendarioDAO = calendarioDAODependency;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAODependency;
  }

  buscarCalendario = async (
    usuarioCPF?: string,
    escolaGUID?: string,
    filters?: CalendarioFilters
  ): Promise<CalendarioAviso[]> => {
    console.log("🟣 CalendarioService.buscarCalendario()");

    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para consultar o calendário.",
      });
    }

    if (!escolaGUID) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "O parâmetro 'EscolaGUID' é obrigatório.",
      });
    }

    const vinculoAtivo = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      UsuarioCPF: usuarioCPF,
      EscolaGUID: escolaGUID,
    });

    console.log("🟣 [CalendarioService] Vínculo encontrado:", vinculoAtivo.length, "registros");

    if (!vinculoAtivo.some((item) => item.Status === "Ativo")) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você não possui vínculo ativo com esta escola.",
      });
    }

    console.log("🟣 [CalendarioService] Chamando buscarAvisosCalendario...");

    const avisos = await this.#calendarioDAO.buscarAvisosCalendario(
      usuarioCPF,
      escolaGUID,
      filters
    );

    console.log("🟣 [CalendarioService] Avisos encontrados:", avisos.length);

    if (filters?.TipoAviso) {
      return avisos.filter((aviso) => aviso.TipoAviso === filters.TipoAviso);
    }

    return avisos;
  };

  buscarDetalhesDia = async (
    usuarioCPF?: string,
    escolaGUID?: string,
    data?: string,
    tipoAviso?: CalendarioTipoAviso
  ): Promise<CalendarioAviso[]> => {
    console.log("🟣 CalendarioService.buscarDetalhesDia()");

    if (!data) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "A data é obrigatória no formato YYYY-MM-DD.",
      });
    }

    const dataFormatada = new Date(`${data}T00:00:00`);
    if (Number.isNaN(dataFormatada.getTime())) {
      throw new ErrorResponse(400, "Erro na validação de dados", {
        message: "Data inválida. Use o formato YYYY-MM-DD.",
      });
    }

    const avisos = await this.buscarCalendario(usuarioCPF, escolaGUID, {
      TipoAviso: tipoAviso,
    });

    const inicioDia = new Date(dataFormatada);
    inicioDia.setHours(0, 0, 0, 0);

    const fimDia = new Date(dataFormatada);
    fimDia.setHours(23, 59, 59, 999);

    return avisos.filter((aviso) => {
      const dataAviso = new Date(aviso.DataPrazo);
      return dataAviso >= inicioDia && dataAviso <= fimDia;
    });
  };
}
