import { NextFunction, Request, Response } from "express";
import EscolaService from "../services/escola.service.js";

export default class EscolaControl {
  #escolaService: EscolaService;

  constructor(escolaServiceDependency: EscolaService) {
    console.log("⬆️  EscolaControl.constructor()");
    this.#escolaService = escolaServiceDependency;
  }

  store = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 EscolaControl.store()");
    try {
      const jsonEscola = request.body.escola;
      const escolaCriada = await this.#escolaService.createEscola(jsonEscola);

      response.status(201).json({
        success: true,
        message: "Cadastro realizado com sucesso",
        data: { escola: escolaCriada },
      });
    } catch (error) {
      next(error);
    }
  };

  index = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 EscolaControl.index()");
    try {
      const nome = typeof request.query.nome === "string" ? request.query.nome : undefined;
      const escolas = await this.#escolaService.findAll(nome);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { escolas },
      });
    } catch (error) {
      next(error);
    }
  };

  show = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 EscolaControl.show()");
    try {
      const { EscolaGUID } = request.params;
      const escola = await this.#escolaService.findById(EscolaGUID);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: escola,
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 EscolaControl.update()");
    try {
      const { EscolaGUID } = request.params;
      const escolaAtualizada = await this.#escolaService.updateEscola(EscolaGUID, request.body.escola);

      response.status(200).json({
        success: true,
        message: "Atualizado com sucesso",
        data: { escola: escolaAtualizada },
      });
    } catch (error) {
      next(error);
    }
  };

  destroy = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 EscolaControl.destroy()");
    try {
      const { EscolaGUID } = request.params;
      const excluiu = await this.#escolaService.deleteEscola(EscolaGUID);

      if (!excluiu) {
        return response.status(404).json({
          success: false,
          message: "Escola não encontrada",
          error: { message: `Não existe escola com id ${EscolaGUID}` },
        });
      }

      return response.status(204).json({
        success: true,
        message: "Excluído com sucesso",
      });
    } catch (error) {
      return next(error);
    }
  };
}