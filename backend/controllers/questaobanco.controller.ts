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
      const usuarioGUID = req.user?.UsuarioGUID || "";
      const questao = await this.#service.criarQuestao(req.body, usuarioGUID);
      res.status(201).json({ success: true, message: "Questão criada com sucesso", data: { questao } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/questaobanco?MateriaGlobalGUID=&SubMateriaGlobalGUID=&Dificuldade=&VestibularGUID= — livre pro aluno
  // Status SEMPRE forçado em 'Validado' aqui, ignorando qualquer coisa que o cliente mande — uma
  // questão extraída de livro e nunca revisada não pode vazar pro aluno só porque alguém chutou
  // um query param. Quem precisa ver 'Pendente' usa `indexPendentes` (atrás de admin guard).
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.index()");
    try {
      const questoes = await this.#service.listarQuestoes({
        MateriaGlobalGUID: req.query.MateriaGlobalGUID as string | undefined,
        SubMateriaGlobalGUID: req.query.SubMateriaGlobalGUID as string | undefined,
        Dificuldade: req.query.Dificuldade as QuestaoBancoDificuldade | undefined,
        VestibularGUID: req.query.VestibularGUID as string | undefined,
        Status: "Validado",
      });
      res.status(200).json({ success: true, message: "Questões listadas com sucesso", data: { questoes } });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/questaobanco/pendentes — só admin de plataforma (fila de validação)
  indexPendentes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.indexPendentes()");
    try {
      const questoes = await this.#service.listarQuestoes({
        MateriaGlobalGUID: req.query.MateriaGlobalGUID as string | undefined,
        SubMateriaGlobalGUID: req.query.SubMateriaGlobalGUID as string | undefined,
        Status: "Pendente",
      });
      res.status(200).json({ success: true, message: "Questões pendentes listadas com sucesso", data: { questoes } });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/questaobanco/:guid — só admin de plataforma (editar enunciado/alternativas/imagem)
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.update()");
    try {
      const usuarioGUID = req.user?.UsuarioGUID || "";
      const questao = await this.#service.atualizarQuestao(req.params.guid, req.body, usuarioGUID);
      res.status(200).json({ success: true, message: "Questão atualizada com sucesso", data: { questao } });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/questaobanco/:guid/validar — só admin de plataforma
  validar = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.validar()");
    try {
      const questao = await this.#service.validarQuestao(req.params.guid);
      res.status(200).json({ success: true, message: "Questão validada com sucesso", data: { questao } });
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

  // GET /api/questaobanco/contagem — livre pro aluno (selects de matéria/submatéria da tela
  // de prática mostrarem "Matemática (45)"). Só conta Validada, nunca Pendente.
  indexContagem = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.indexContagem()");
    try {
      const contagem = await this.#service.contarQuestoesValidadas();
      res.status(200).json({ success: true, message: "Contagem calculada com sucesso", data: contagem });
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
