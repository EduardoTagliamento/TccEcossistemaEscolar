import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import EscolaControl from "../backend/controllers/escola.controller";
import EscolaMiddleware from "../backend/middlewares/escola.middleware";
import EscolaService from "../backend/services/escola.service";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { ExclusaoEscolaDAO } from "../backend/repositories/exclusao-escola.repository";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

export default class EscolaRoteador {
  #router: Router;
  #escolaControle: EscolaControl;
  #escolaMiddleware: EscolaMiddleware;

  constructor(escolaMiddleware: EscolaMiddleware, escolaControle: EscolaControl) {
    console.log("⬆️ EscolaRoteador.constructor()");
    this.#router = Router();
    this.#escolaMiddleware = escolaMiddleware;
    this.#escolaControle = escolaControle;
  }

  createRoutes = () => {
    console.log("⬆️ EscolaRoteador.createRoutes()");

    this.#router.post(
      "/",
      AuthMiddleware.authenticate,
      this.#escolaMiddleware.validateCreateBody,
      this.#escolaControle.store
    );

    this.#router.put(
      "/:EscolaGUID",
      AuthMiddleware.authenticate,
      this.#escolaMiddleware.validateIdParam,
      this.#escolaMiddleware.validateUpdateBody,
      this.#escolaControle.update
    );

    this.#router.delete(
      "/:EscolaGUID",
      AuthMiddleware.authenticate,
      this.#escolaMiddleware.validateIdParam,
      this.#escolaControle.destroy
    );

    // POST /api/escola/:EscolaGUID/solicitar-exclusao — envia código de 6
    // dígitos pro email de quem está pedindo (só Direção da escola).
    this.#router.post(
      "/:EscolaGUID/solicitar-exclusao",
      AuthMiddleware.authenticate,
      this.#escolaMiddleware.validateIdParam,
      this.#escolaControle.solicitarExclusao
    );

    // POST /api/escola/:EscolaGUID/confirmar-exclusao — valida o código e
    // desativa a escola (soft-delete; exclusão definitiva em 30 dias).
    this.#router.post(
      "/:EscolaGUID/confirmar-exclusao",
      AuthMiddleware.authenticate,
      this.#escolaMiddleware.validateIdParam,
      this.#escolaControle.confirmarExclusao
    );

    // PUT /api/escola/:EscolaGUID/transferir-direcao — elege um Coordenação
    // ativo para assumir a Direção; quem chama (Direção atual) passa a
    // Coordenação (troca simétrica, ver EscolaService.transferirDirecao).
    this.#router.put(
      "/:EscolaGUID/transferir-direcao",
      AuthMiddleware.authenticate,
      this.#escolaMiddleware.validateIdParam,
      this.#escolaMiddleware.validateTransferirDirecaoBody,
      this.#escolaControle.transferirDirecao
    );

    this.#router.get("/", AuthMiddleware.authenticate, this.#escolaControle.index);

    this.#router.get(
      "/:EscolaGUID",
      AuthMiddleware.authenticate,
      this.#escolaMiddleware.validateIdParam,
      this.#escolaControle.show
    );

    return this.#router;
  };
}

export const escolaRouterFactory = () => {
  const database = new MysqlDatabase();
  const escolaDAO = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const exclusaoEscolaDAO = new ExclusaoEscolaDAO(database);
  const usuarioDAO = new UsuarioDAO(database);
  const escolaService = new EscolaService(escolaDAO, escolaxUsuarioxFuncaoDAO, exclusaoEscolaDAO, usuarioDAO);
  const escolaControle = new EscolaControl(escolaService);
  const escolaMiddleware = new EscolaMiddleware();
  const roteador = new EscolaRoteador(escolaMiddleware, escolaControle);

  return roteador.createRoutes();
};