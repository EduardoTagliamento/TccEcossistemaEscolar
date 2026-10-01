import { Request, Response, NextFunction } from "express";
import FeiraUnivapService from "../services/feiraunivap.service";

export class FeiraUnivapController {
  #service: FeiraUnivapService;

  constructor(service: FeiraUnivapService) {
    console.log("⬆️  FeiraUnivapController.constructor()");
    this.#service = service;
  }

  listarTurmas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ano = String(req.query.ano ?? "");
      const turmas = await this.#service.listarTurmasPorAno(ano);
      res.status(200).json({ message: "Turmas listadas com sucesso", data: { turmas } });
    } catch (erro) {
      next(erro);
    }
  };

  listarPessoas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const turmaGUID = String(req.query.turmaGUID ?? "");
      const pessoas = await this.#service.listarPessoasPorTurma(turmaGUID);
      res.status(200).json({ message: "Pessoas listadas com sucesso", data: { pessoas } });
    } catch (erro) {
      next(erro);
    }
  };

  ativar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const resultado = await this.#service.ativar(req.body);
      res.status(200).json({ message: "Conta ativada com sucesso", data: resultado });
    } catch (erro) {
      next(erro);
    }
  };
}
