import { NextFunction, Request, Response } from "express";
import CalendarioService from "../services/calendario.service";
import { CalendarioTipoAviso } from "../entities/calendario.model";

export default class CalendarioControl {
  #calendarioService: CalendarioService;

  constructor(calendarioServiceDependency: CalendarioService) {
    console.log("⬆️  CalendarioControl.constructor()");
    this.#calendarioService = calendarioServiceDependency;
  }

  index = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CalendarioControl.index()");
    try {
      const usuarioCPF = request.user?.UsuarioCPF;
      const escolaGUID = request.query.EscolaGUID as string | undefined;
      const tipoAviso = request.query.TipoAviso as CalendarioTipoAviso | undefined;

      const filters = {
        DataInicio: request.query.DataInicio
          ? new Date(request.query.DataInicio as string)
          : undefined,
        DataFim: request.query.DataFim ? new Date(request.query.DataFim as string) : undefined,
        TipoAviso: tipoAviso,
      };

      const avisos = await this.#calendarioService.buscarCalendario(
        usuarioCPF,
        escolaGUID,
        filters
      );

      response.status(200).json({
        success: true,
        message: "Calendário carregado",
        data: { avisos, total: avisos.length },
      });
    } catch (error) {
      next(error);
    }
  };

  showDia = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CalendarioControl.showDia()");
    try {
      const usuarioCPF = request.user?.UsuarioCPF;
      const escolaGUID = request.query.EscolaGUID as string | undefined;
      const { data } = request.params;
      const tipoAviso = request.query.TipoAviso as CalendarioTipoAviso | undefined;

      const avisos = await this.#calendarioService.buscarDetalhesDia(
        usuarioCPF,
        escolaGUID,
        data,
        tipoAviso
      );

      response.status(200).json({
        success: true,
        message: "Detalhes do dia carregados",
        data: { avisos, total: avisos.length },
      });
    } catch (error) {
      next(error);
    }
  };
}
