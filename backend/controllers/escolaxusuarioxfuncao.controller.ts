import { NextFunction, Request, Response } from "express";
import EscolaxUsuarioxFuncaoService from "../services/escolaxusuarioxfuncao.service.js";

export default class EscolaxUsuarioxFuncaoControl {
  #service: EscolaxUsuarioxFuncaoService;

  constructor(serviceDependency: EscolaxUsuarioxFuncaoService) {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.constructor()");
    this.#service = serviceDependency;
  }

  store = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.store()");
    try {
      const payload = request.body.escolaxusuarioxfuncao;
      const relacao = await this.#service.createRelacao(payload);

      response.status(201).json({
        success: true,
        message: "Vinculo cadastrado com sucesso",
        data: { escolaxusuarioxfuncao: relacao },
      });
    } catch (error) {
      next(error);
    }
  };

  index = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.index()");
    try {
      const filters = {
        UsuarioCPF:
          typeof request.query.UsuarioCPF === "string"
            ? request.query.UsuarioCPF
            : undefined,
        EscolaGUID:
          typeof request.query.EscolaGUID === "string"
            ? request.query.EscolaGUID
            : undefined,
        FuncaoId:
          typeof request.query.FuncaoId === "string"
            ? Number(request.query.FuncaoId)
            : undefined,
      };

      const relacoes = await this.#service.findAll(filters);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { escolaxusuarioxfuncaos: relacoes },
      });
    } catch (error) {
      next(error);
    }
  };

  show = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.show()");
    try {
      const id = Number(request.params.EscolaxUsuarioxFuncaoId);
      const relacao = await this.#service.findById(id);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { escolaxusuarioxfuncao: relacao },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.update()");
    try {
      const id = Number(request.params.EscolaxUsuarioxFuncaoId);
      const payload = request.body.escolaxusuarioxfuncao;
      const relacao = await this.#service.updateRelacao(id, payload);

      response.status(200).json({
        success: true,
        message: "Vinculo atualizado com sucesso",
        data: { escolaxusuarioxfuncao: relacao },
      });
    } catch (error) {
      next(error);
    }
  };

  destroy = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.destroy()");
    try {
      const id = Number(request.params.EscolaxUsuarioxFuncaoId);
      const deleted = await this.#service.deleteRelacao(id);

      response.status(200).json({
        success: true,
        message: "Vinculo excluido com sucesso",
        data: { deleted },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/usuario/:cpf/escolas
   * Retorna todas as escolas vinculadas ao usuário com suas funções
   */
  getEscolasByUsuario = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.getEscolasByUsuario()");
    try {
      const UsuarioCPF = request.params.cpf;

      const escolas = await this.#service.findEscolasByUsuario(UsuarioCPF);

      response.status(200).json({
        success: true,
        message: "Escolas do usuario obtidas com sucesso",
        data: { escolas },
      });
    } catch (error) {
      next(error);
    }
  };
}
