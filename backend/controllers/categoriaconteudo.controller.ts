import { Request, Response, NextFunction } from "express";
import CategoriaConteudoService from "../services/categoriaconteudo.service";

export class CategoriaConteudoController {
  #categoriaService: CategoriaConteudoService;

  constructor(categoriaService: CategoriaConteudoService) {
    console.log("⬆️  CategoriaConteudoController.constructor()");
    this.#categoriaService = categoriaService;
  }

  // POST /api/categoria-conteudo
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.store()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const categoria = await this.#categoriaService.criarCategoria(req.body.categoria, usuarioCPF);

      res.status(201).json({
        success: true,
        message: "Categoria criada com sucesso",
        data: { categoria },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/categoria-conteudo?MateriaGUID=&UsuarioCPF=&TurmaGUID=
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.index()");
    try {
      const categorias = await this.#categoriaService.listarCategorias({
        MateriaGUID: req.query.MateriaGUID as string | undefined,
        UsuarioCPF: req.query.UsuarioCPF as string | undefined,
        TurmaGUID: req.query.TurmaGUID as string | undefined,
      });

      res.json({
        success: true,
        message: "Categorias listadas com sucesso",
        data: { categorias, total: categorias.length },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/categoria-conteudo/completas/:materiaGUID/:turmaGUID
  buscarCategoriasCompletas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.buscarCategoriasCompletas()");
    try {
      const { materiaGUID, turmaGUID } = req.params;
      const usuarioCPF = req.user?.UsuarioCPF || "";

      const categorias = await this.#categoriaService.buscarCategoriasCompletas(materiaGUID, turmaGUID, usuarioCPF);

      res.json({ success: true, message: "Categorias obtidas com sucesso", data: { categorias } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/categoria-conteudo/tem-pendencia/:materiaGUID/:turmaGUID?EhProfessor=true|false
  temPendencia = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.temPendencia()");
    try {
      const { materiaGUID, turmaGUID } = req.params;
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const ehProfessor = req.query.EhProfessor === "true";

      const pendencia = await this.#categoriaService.verificarPendencia(materiaGUID, turmaGUID, usuarioCPF, ehProfessor);

      res.json({ success: true, message: "Verificado com sucesso", data: { pendencia } });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/categoria-conteudo/reordenar
  reordenar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.reordenar()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const { MateriaGUID, TurmaGUID, ordem } = req.body;
      const categorias = await this.#categoriaService.reordenarCategorias(usuarioCPF, MateriaGUID, TurmaGUID, ordem);

      res.json({
        success: true,
        message: "Categorias reordenadas com sucesso",
        data: { categorias },
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/categoria-conteudo/:guid
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.update()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const categoria = await this.#categoriaService.atualizarCategoria(
        req.params.guid,
        req.body.categoria?.CategoriaNome,
        usuarioCPF
      );

      res.json({
        success: true,
        message: "Categoria atualizada com sucesso",
        data: { categoria },
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/categoria-conteudo/:guid
  destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.destroy()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      await this.#categoriaService.excluirCategoria(req.params.guid, usuarioCPF);

      res.json({
        success: true,
        message: "Categoria excluída com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };
}
