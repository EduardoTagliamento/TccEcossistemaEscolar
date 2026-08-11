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
      const usuarioGUID = req.user?.UsuarioGUID || "";
      const assunto = await this.#assuntoService.criarAssunto(req.body.assunto, usuarioGUID);

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
      const usuarioGUID = req.user?.UsuarioGUID || "";
      await this.#assuntoService.excluirAssunto(req.params.guid, usuarioGUID);

      res.status(200).json({ success: true, message: "Assunto excluído com sucesso", data: null });
    } catch (error) {
      next(error);
    }
  };
}
