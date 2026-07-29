import { Request, Response, NextFunction } from "express";
import ConteudoService, { ConteudoCreateDTO } from "../services/conteudo.service";
import ErrorResponse from "../utils/ErrorResponse";

export class ConteudoController {
  #conteudoService: ConteudoService;

  constructor(conteudoService: ConteudoService) {
    console.log("⬆️  ConteudoController.constructor()");
    this.#conteudoService = conteudoService;
  }

  // POST /api/conteudo (multipart/form-data)
  store = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ConteudoController.store()");

    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const body = req.body;

      let turmasGUID: string[];
      let datasPorTurma: Record<string, Date> | undefined;

      try {
        turmasGUID = JSON.parse(body.TurmasGUID);
      } catch {
        throw new ErrorResponse(400, "TurmasGUID inválido", {
          message: "TurmasGUID deve ser um array JSON de UUIDs.",
        });
      }

      if (body.DatasPorTurma) {
        try {
          const parsed = JSON.parse(body.DatasPorTurma) as Record<string, string>;
          datasPorTurma = Object.fromEntries(
            Object.entries(parsed).map(([turmaGUID, data]) => [turmaGUID, new Date(data)])
          );
        } catch {
          throw new ErrorResponse(400, "DatasPorTurma inválido", {
            message: "DatasPorTurma deve ser um objeto JSON { TurmaGUID: data }.",
          });
        }
      }

      let categoriasPorTurma: Record<string, string> | undefined;
      if (body.CategoriasPorTurma) {
        try {
          categoriasPorTurma = JSON.parse(body.CategoriasPorTurma);
        } catch {
          throw new ErrorResponse(400, "CategoriasPorTurma inválido", {
            message: "CategoriasPorTurma deve ser um objeto JSON { TurmaGUID: CategoriaGUID }.",
          });
        }
      }

      const createData: ConteudoCreateDTO = {
        MateriaGUID: body.MateriaGUID,
        ConteudoTitulo: body.ConteudoTitulo,
        ConteudoTipo: body.ConteudoTipo,
        ConteudoDescricao: body.ConteudoDescricao || undefined,
        TurmasGUID: turmasGUID,
        ConteudoDataPublicacao: new Date(body.ConteudoDataPublicacao),
        DatasPorTurma: datasPorTurma,
        CategoriasPorTurma: categoriasPorTurma,
        OrigemTipo: body.OrigemTipo || undefined,
        LinkUrl: body.LinkUrl || undefined,
        ConteudoHtml: body.ConteudoHtml || undefined,
      };

      const arquivosRecebidos = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      const conteudo = await this.#conteudoService.criarConteudo(
        createData,
        {
          arquivoCronometrado: arquivosRecebidos?.arquivo?.[0],
          arquivosPaginado: arquivosRecebidos?.arquivos,
        },
        usuarioCPF
      );

      res.status(201).json({
        success: true,
        message: "Conteúdo criado com sucesso",
        data: { conteudo },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/conteudo?MateriaGUID=&UsuarioCPF=&CategoriaGUID=&ConteudoTipo=
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ConteudoController.index()");
    try {
      const conteudos = await this.#conteudoService.listarConteudos({
        MateriaGUID: req.query.MateriaGUID as string | undefined,
        UsuarioCPF: req.query.UsuarioCPF as string | undefined,
        CategoriaGUID: req.query.CategoriaGUID as string | undefined,
        ConteudoTipo: req.query.ConteudoTipo as any,
      });

      res.json({
        success: true,
        message: "Conteúdos listados com sucesso",
        data: { conteudos, total: conteudos.length },
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/conteudo/:guid
  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ConteudoController.show()");
    try {
      const conteudo = await this.#conteudoService.buscarConteudo(req.params.guid);

      res.json({
        success: true,
        message: "Conteúdo encontrado",
        data: { conteudo },
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/conteudo/:guid (multipart/form-data) — título/descrição + mídia
  // (HTML do texto, link do vídeo por link, ou arquivo(s) de substituição);
  // ConteudoTipo, origem e turmas distribuídas continuam imutáveis aqui.
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ConteudoController.update()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const body = req.body;
      const arquivosRecebidos = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;

      const conteudoAtualizado = await this.#conteudoService.atualizarConteudo(
        req.params.guid,
        {
          ConteudoTitulo: body.ConteudoTitulo,
          ConteudoDescricao: body.ConteudoDescricao,
          ConteudoHtml: body.ConteudoHtml,
          LinkUrl: body.LinkUrl,
        },
        usuarioCPF,
        {
          arquivoCronometrado: arquivosRecebidos?.arquivo?.[0],
          arquivosPaginado: arquivosRecebidos?.arquivos,
        }
      );

      res.json({
        success: true,
        message: "Conteúdo atualizado com sucesso",
        data: { conteudo: conteudoAtualizado },
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/conteudo/:guid
  destroy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ConteudoController.destroy()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      await this.#conteudoService.excluirConteudo(req.params.guid, usuarioCPF);

      res.json({
        success: true,
        message: "Conteúdo excluído com sucesso",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/conteudo/:guid/turma/:turmaGUID
   * "Excluir só desta turma" — se for a última turma restante, cai pra exclusão completa.
   */
  destroyDeTurma = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 ConteudoController.destroyDeTurma()");
    try {
      const usuarioCPF = req.user?.UsuarioCPF;
      if (!usuarioCPF) {
        res.status(401).json({ success: false, message: "Usuário não autenticado", data: null });
        return;
      }

      const resultado = await this.#conteudoService.removerConteudoDeTurma(
        req.params.guid,
        req.params.turmaGUID,
        usuarioCPF
      );

      res.json({
        success: true,
        message: resultado.conteudoExcluidoPorCompleto
          ? "Conteúdo excluído (era a única turma restante)"
          : "Conteúdo removido desta turma",
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  };
}
