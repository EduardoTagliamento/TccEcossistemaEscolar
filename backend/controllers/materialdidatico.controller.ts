import { Request, Response, NextFunction } from "express";
import MaterialDidaticoService from "../services/materialdidatico.service";

export class MaterialDidaticoController {
  #service: MaterialDidaticoService;

  constructor(service: MaterialDidaticoService) {
    console.log("⬆️  MaterialDidaticoController.constructor()");
    this.#service = service;
  }

  // POST /api/materialdidatico — body: { EscolaGUID, Titulo }
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.store()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const material = await this.#service.cadastrarLivro(req.body.EscolaGUID, req.body.Titulo, usuarioCPF);

      res.status(201).json({ success: true, message: "Material didático cadastrado com sucesso", data: { material } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materialdidatico?EscolaGUID=
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.index()");
    try {
      const materiais = await this.#service.listarLivros(req.query.EscolaGUID as string);
      res.status(200).json({ success: true, message: "Materiais didáticos listados com sucesso", data: { materiais } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materialdidatico/por-materia/:materiaGUID
  indexPorMateria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.indexPorMateria()");
    try {
      const materiais = await this.#service.listarLivrosPorMateria(req.params.materiaGUID);
      res.status(200).json({ success: true, message: "Materiais didáticos listados com sucesso", data: { materiais } });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/materialdidatico/:guid/paginas (multipart, campo "paginas")
  uploadPaginas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.uploadPaginas()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const arquivos = ((req.files as Express.Multer.File[]) || []).map((f) => ({
        buffer: f.buffer,
        mimetype: f.mimetype,
        originalname: f.originalname,
      }));

      const paginas = await this.#service.uploadPaginas(req.params.guid, arquivos, usuarioCPF);
      res.status(201).json({ success: true, message: "Páginas enviadas com sucesso, extração em andamento", data: { paginas } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materialdidatico/:guid/paginas
  listarPaginas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.listarPaginas()");
    try {
      const paginas = await this.#service.listarPaginas(req.params.guid);
      res.status(200).json({ success: true, message: "Páginas listadas com sucesso", data: { paginas } });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/materialdidatico/pagina/:paginaGuid/revisar — body: { TextoRevisado }
  revisarPagina = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.revisarPagina()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      await this.#service.revisarPagina(req.params.paginaGuid, usuarioCPF, req.body.TextoRevisado);
      res.status(200).json({ success: true, message: "Página revisada com sucesso", data: null });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materialdidatico/:guid/sugestao-capitulos
  sugerirCapitulos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.sugerirCapitulos()");
    try {
      const sugestoes = await this.#service.sugerirCapitulos(req.params.guid);
      res.status(200).json({ success: true, message: "Sugestão de capítulos gerada com sucesso", data: { sugestoes } });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/materialdidatico/capitulo — body: { MaterialDidaticoGUID, MateriaGUID, Titulo, PaginaInicio, PaginaFim, AssuntoGUID? }
  criarCapitulo = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.criarCapitulo()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF || "";
      const capitulo = await this.#service.criarCapitulo(req.body, usuarioCPF);
      res.status(201).json({ success: true, message: "Capítulo criado com sucesso", data: { capitulo } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materialdidatico/:guid/capitulos
  listarCapitulos = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.listarCapitulos()");
    try {
      const capitulos = await this.#service.listarCapitulos(req.params.guid);
      res.status(200).json({ success: true, message: "Capítulos listados com sucesso", data: { capitulos } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/materialdidatico/:guid/capitulos/materia/:materiaGUID
  listarCapitulosPorMateria = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 MaterialDidaticoController.listarCapitulosPorMateria()");
    try {
      const capitulos = await this.#service.listarCapitulosPorLivroEMateria(req.params.guid, req.params.materiaGUID);
      res.status(200).json({ success: true, message: "Capítulos listados com sucesso", data: { capitulos } });
    } catch (error) {
      next(error);
    }
  };
}
