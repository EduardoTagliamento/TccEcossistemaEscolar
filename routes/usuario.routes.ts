import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import UsuarioControl from "../backend/controllers/usuario.controller";
import UsuarioMiddleware from "../backend/middlewares/usuario.middleware";
import UsuarioService from "../backend/services/usuario.service";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import EscolaxUsuarioxFuncaoControl from "../backend/controllers/escolaxusuarioxfuncao.controller";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";
import { authRateLimitMiddleware } from "../backend/middlewares/rate-limit.middleware";

export default class UsuarioRoteador {
  #router: Router;
  #usuarioControle: UsuarioControl;
  #usuarioMiddleware: UsuarioMiddleware;
  #escolaxUsuarioxFuncaoControle: EscolaxUsuarioxFuncaoControl;

  constructor(
    usuarioMiddleware: UsuarioMiddleware,
    usuarioControle: UsuarioControl,
    escolaxUsuarioxFuncaoControle: EscolaxUsuarioxFuncaoControl
  ) {
    console.log("⬆️ UsuarioRoteador.constructor()");
    this.#router = Router();
    this.#usuarioMiddleware = usuarioMiddleware;
    this.#usuarioControle = usuarioControle;
    this.#escolaxUsuarioxFuncaoControle = escolaxUsuarioxFuncaoControle;
  }

  createRoutes = () => {
    console.log("⬆️ UsuarioRoteador.createRoutes()");

    // POST /api/usuario - Criar usuário
    this.#router.post(
      "/",
      authRateLimitMiddleware,
      this.#usuarioMiddleware.validateCreateBody,
      this.#usuarioControle.store
    );

    // PUT /api/usuario/:UsuarioGUID - Atualizar usuário (exige autenticação)
    this.#router.put(
      "/:UsuarioGUID",
      AuthMiddleware.authenticate,
      this.#usuarioMiddleware.validateGuidParam,
      this.#usuarioMiddleware.validateUpdateBody,
      this.#usuarioControle.update
    );

    // PATCH /api/usuario/:UsuarioGUID/senha - Trocar a própria senha (exige autenticação)
    this.#router.patch(
      "/:UsuarioGUID/senha",
      AuthMiddleware.authenticate,
      this.#usuarioMiddleware.validateGuidParam,
      this.#usuarioMiddleware.validateSenhaBody,
      this.#usuarioControle.updateSenha
    );

    // DELETE /api/usuario/:UsuarioGUID - Deletar usuário (exige autenticação)
    this.#router.delete(
      "/:UsuarioGUID",
      AuthMiddleware.authenticate,
      this.#usuarioMiddleware.validateGuidParam,
      this.#usuarioControle.destroy
    );

    // GET /api/usuario - Listar usuários (com filtro opcional por nome)
    this.#router.get("/", this.#usuarioControle.index);

    // GET /api/usuario/busca-cpf?cpf= - Buscar usuário existente por CPF
    // (DEVE vir antes de "/:UsuarioGUID" pra não colidir com ele)
    this.#router.get(
      "/busca-cpf",
      AuthMiddleware.authenticate,
      this.#usuarioControle.buscarPorCPF
    );

    // GET /api/usuario/:UsuarioGUID/escolas - Buscar escolas do usuário
    this.#router.get(
      "/:UsuarioGUID/escolas",
      this.#usuarioMiddleware.validateGuidParam,
      this.#escolaxUsuarioxFuncaoControle.getEscolasByUsuario
    );

    // POST /api/usuario/:UsuarioGUID/escolas/:EscolaGUID/acesso - Registrar último acesso do usuário na escola
    this.#router.post(
      "/:UsuarioGUID/escolas/:EscolaGUID/acesso",
      AuthMiddleware.authenticate,
      this.#usuarioMiddleware.validateGuidParam,
      this.#escolaxUsuarioxFuncaoControle.registrarAcesso
    );

    // GET /api/usuario/:UsuarioGUID - Buscar usuário por GUID
    this.#router.get(
      "/:UsuarioGUID",
      this.#usuarioMiddleware.validateGuidParam,
      this.#usuarioControle.show
    );

    return this.#router;
  };
}

export const usuarioRouterFactory = () => {
  const database = new MysqlDatabase();
  
  // Usuario dependencies
  const usuarioDAO = new UsuarioDAO(database);
  const usuarioService = new UsuarioService(usuarioDAO);
  const usuarioControle = new UsuarioControl(usuarioService);
  const usuarioMiddleware = new UsuarioMiddleware();
  
  // EscolaxUsuarioxFuncao dependencies (para rota de escolas do usuário)
  const { EscolaxUsuarioxFuncaoDAO } = require("../backend/repositories/escolaxusuarioxfuncao.repository");
  const { UsuarioxEscolaAcessoDAO } = require("../backend/repositories/usuarioxescolaacesso.repository");
  const { EscolaDAO } = require("../backend/repositories/escola.repository");
  const EscolaxUsuarioxFuncaoService = require("../backend/services/escolaxusuarioxfuncao.service").default;

  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const usuarioxEscolaAcessoDAO = new UsuarioxEscolaAcessoDAO(database);
  const escolaDAOParaVinculo = new EscolaDAO(database);
  const escolaxUsuarioxFuncaoService = new EscolaxUsuarioxFuncaoService(escolaxUsuarioxFuncaoDAO, usuarioxEscolaAcessoDAO, usuarioDAO, escolaDAOParaVinculo);
  const escolaxUsuarioxFuncaoControle = new EscolaxUsuarioxFuncaoControl(escolaxUsuarioxFuncaoService);
  
  const roteador = new UsuarioRoteador(
    usuarioMiddleware,
    usuarioControle,
    escolaxUsuarioxFuncaoControle
  );

  return roteador.createRoutes();
};
