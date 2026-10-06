import { Request, Response, NextFunction } from "express";
import QuestaoBancoService from "../services/questaobanco.service";
import QuestaoBancoProgressoService from "../services/questaobancoprogresso.service";
import { QuestaoBancoDificuldade } from "../entities/questaobanco.model";
import ErrorResponse from "../utils/ErrorResponse";

export class QuestaoBancoController {
  #service: QuestaoBancoService;
  #progressoService: QuestaoBancoProgressoService;

  constructor(service: QuestaoBancoService, progressoService: QuestaoBancoProgressoService) {
    console.log("⬆️  QuestaoBancoController.constructor()");
    this.#service = service;
    this.#progressoService = progressoService;
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
        ExcluirFeitasDoUsuarioGUID: req.user?.UsuarioGUID,
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

  // POST /api/questaobanco/:guid/progresso — aluno autenticado, body: { Acertou: boolean }
  registrarResposta = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.registrarResposta()");
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) throw new ErrorResponse(401, "Não autenticado");
      if (typeof req.body.Acertou !== "boolean") {
        throw new ErrorResponse(400, "Dados inválidos", { message: "O campo 'Acertou' é obrigatório e deve ser booleano." });
      }
      await this.#progressoService.registrarResposta(usuarioGUID, req.params.guid, req.body.Acertou);
      res.status(200).json({ success: true, message: "Resposta registrada com sucesso", data: null });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/questaobanco/:guid/progresso — "revisitar": volta pro pool de randomização
  desmarcarFeita = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.desmarcarFeita()");
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) throw new ErrorResponse(401, "Não autenticado");
      await this.#progressoService.desmarcarFeita(usuarioGUID, req.params.guid);
      res.status(200).json({ success: true, message: "Questão voltou a entrar na prática", data: null });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/questaobanco/:guid/marcar — aluno autenticado, body: { Marcada: boolean }
  definirMarcada = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.definirMarcada()");
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) throw new ErrorResponse(401, "Não autenticado");
      if (typeof req.body.Marcada !== "boolean") {
        throw new ErrorResponse(400, "Dados inválidos", { message: "O campo 'Marcada' é obrigatório e deve ser booleano." });
      }
      await this.#progressoService.definirMarcada(usuarioGUID, req.params.guid, req.body.Marcada);
      res.status(200).json({ success: true, message: "Questão atualizada com sucesso", data: null });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/questaobanco/progresso?Status=Feitas|Marcadas&VestibularGUID=&Dificuldade=
  indexProgresso = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.indexProgresso()");
    try {
      const usuarioGUID = req.user?.UsuarioGUID;
      if (!usuarioGUID) throw new ErrorResponse(401, "Não autenticado");
      const status = req.query.Status === "Marcadas" ? "Marcadas" : "Feitas";
      const acertouQuery = req.query.Acertou;
      const questoes = await this.#progressoService.listarHistorico(usuarioGUID, status, {
        VestibularGUID: req.query.VestibularGUID as string | undefined,
        Dificuldade: req.query.Dificuldade as QuestaoBancoDificuldade | undefined,
        Acertou: acertouQuery === "true" ? true : acertouQuery === "false" ? false : undefined,
      });
      res.status(200).json({ success: true, message: "Histórico listado com sucesso", data: { questoes } });
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

  // GET /api/questaobanco/:guid — livre pro aluno (ex.: "refazer essa questão" a partir do
  // histórico) — só Status='Validado'. Registrado DEPOIS de /contagem, /progresso, /vestibular,
  // /pendentes (literais) na rota, pra não ser engolido por eles como se fossem um :guid.
  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log("🔵 QuestaoBancoController.show()");
    try {
      const questao = await this.#service.buscarQuestaoValidada(req.params.guid);
      res.status(200).json({ success: true, message: "Questão encontrada com sucesso", data: { questao } });
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
