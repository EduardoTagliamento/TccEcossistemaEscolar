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

  // GET /api/categoria-conteudo/geral/:materiaGUID — board geral (categorias por nome, todas as turmas)
  buscarBoardGeral = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.buscarBoardGeral()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const { materiaGUID } = req.params;
      const board = await this.#categoriaService.buscarBoardGeral(usuarioCPF, materiaGUID);

      res.json({ success: true, message: "Board geral obtido com sucesso", data: { board } });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/categoria-conteudo/geral — cria/aplica categoria em todas as turmas da matéria
  criarCategoriaGeral = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.criarCategoriaGeral()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const { MateriaGUID, CategoriaNome } = req.body;
      await this.#categoriaService.criarCategoriaGeral(usuarioCPF, MateriaGUID, CategoriaNome);
      const board = await this.#categoriaService.buscarBoardGeral(usuarioCPF, MateriaGUID);

      res.status(201).json({ success: true, message: "Categoria aplicada a todas as turmas com sucesso", data: { board } });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/categoria-conteudo/geral/reordenar
  reordenarCategoriasGerais = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.reordenarCategoriasGerais()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const { MateriaGUID, ordem } = req.body;
      const board = await this.#categoriaService.reordenarCategoriasGerais(usuarioCPF, MateriaGUID, ordem);

      res.json({ success: true, message: "Categorias gerais reordenadas com sucesso", data: { board } });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/categoria-conteudo/geral/mover-item
  moverItemBoardGeral = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.moverItemBoardGeral()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const { MateriaGUID, ItemGUID, Tipo, TurmaGUID, CategoriaNome } = req.body;
      const board = await this.#categoriaService.moverItemBoardGeral(
        usuarioCPF,
        MateriaGUID,
        ItemGUID,
        Tipo,
        TurmaGUID,
        CategoriaNome ?? null
      );

      res.json({ success: true, message: "Item movido com sucesso", data: { board } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/categoria-conteudo/tem-pendencia-agregado?EhProfessor=true|false
  temPendenciaAgregada = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.temPendenciaAgregada()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const ehProfessor = req.query.EhProfessor === "true";

      const pendencia = await this.#categoriaService.verificarPendenciaAgregada(usuarioCPF, ehProfessor);

      res.json({ success: true, message: "Verificado com sucesso", data: { pendencia } });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/categoria-conteudo/reordenar-itens
  reordenarItens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 CategoriaConteudoController.reordenarItens()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const { MateriaGUID, TurmaGUID, CategoriaGUID, itens } = req.body;
      const categorias = await this.#categoriaService.reordenarItens(
        usuarioCPF,
        MateriaGUID,
        TurmaGUID,
        CategoriaGUID,
        itens
      );

      res.json({
        success: true,
        message: "Itens reordenados com sucesso",
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
