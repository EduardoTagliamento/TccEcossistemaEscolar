import { Request, Response, NextFunction } from "express";
import AssuntoService from "../services/assunto.service";

export class AssuntoController {
  #assuntoService: AssuntoService;

  constructor(assuntoService: AssuntoService) {
    console.log("⬆️  AssuntoController.constructor()");
    this.#assuntoService = assuntoService;
  }

  // POST /api/assunto — body: { assunto: {...} }
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 AssuntoController.store()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const assunto = await this.#assuntoService.criarAssunto(req.body.assunto, usuarioCPF);

      res.status(201).json({ success: true, message: "Assunto criado com sucesso", data: { assunto } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/assunto?MateriaGUID=
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 AssuntoController.index()");
    try {
      const materiaGUID = req.query.MateriaGUID as string;
      const assuntos = await this.#assuntoService.listarPorMateria(materiaGUID);

      res.status(200).json({ success: true, message: "Assuntos listados com sucesso", data: { assuntos } });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/assunto/:guid
  destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 AssuntoController.destroy()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      await this.#assuntoService.excluirAssunto(req.params.guid, usuarioCPF);

      res.status(200).json({ success: true, message: "Assunto excluído com sucesso", data: null });
    } catch (error) {
      next(error);
    }
  };
}
