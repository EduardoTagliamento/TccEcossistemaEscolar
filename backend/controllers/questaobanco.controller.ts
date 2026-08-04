import { Request, Response, NextFunction } from "express";
import QuestaoBancoService from "../services/questaobanco.service";
import { QuestaoBancoDificuldade } from "../entities/questaobanco.model";

export class QuestaoBancoController {
  #service: QuestaoBancoService;

  constructor(service: QuestaoBancoService) {
    console.log("⬆️  QuestaoBancoController.constructor()");
    this.#service = service;
  }

  // POST /api/questaobanco — só admin de plataforma
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.store()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const questao = await this.#service.criarQuestao(req.body, usuarioCPF);
      res.status(201).json({ success: true, message: "Questão criada com sucesso", data: { questao } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/questaobanco?SubMateriaGlobalGUID=&Dificuldade=&VestibularGUID= — livre pro aluno
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.index()");
    try {
      const questoes = await this.#service.listarQuestoes({
        SubMateriaGlobalGUID: req.query.SubMateriaGlobalGUID as string | undefined,
        Dificuldade: req.query.Dificuldade as QuestaoBancoDificuldade | undefined,
        VestibularGUID: req.query.VestibularGUID as string | undefined,
      });
      res.status(200).json({ success: true, message: "Questões listadas com sucesso", data: { questoes } });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/questaobanco/:guid — só admin de plataforma
  destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.destroy()");
    try {
      await this.#service.excluirQuestao(req.params.guid);
      res.status(200).json({ success: true, message: "Questão excluída com sucesso", data: null });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/questaobanco/vestibular — livre (usado pro filtro do modal)
  indexVestibulares = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.indexVestibulares()");
    try {
      const vestibulares = await this.#service.listarVestibulares();
      res.status(200).json({ success: true, message: "Vestibulares listados com sucesso", data: { vestibulares } });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/questaobanco/vestibular — só admin de plataforma
  storeVestibular = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.storeVestibular()");
    try {
      const vestibular = await this.#service.criarVestibular(req.body.Nome);
      res.status(201).json({ success: true, message: "Vestibular criado com sucesso", data: { vestibular } });
    } catch (error) {
      next(error);
    }
  };
}
