import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import UsuarioControl from "../backend/controllers/usuario.controller";
import UsuarioMiddleware from "../backend/middlewares/usuario.middleware";
import UsuarioService from "../backend/services/usuario.service";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import EscolaxUsuarioxFuncaoControl from "../backend/controllers/escolaxusuarioxfuncao.controller";
import { AuthMiddleware } from "../backend/middlewares/auth.middleware";

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
      this.#usuarioMiddleware.validateCreateBody,
      this.#usuarioControle.store
    );

    // PUT /api/usuario/:UsuarioCPF - Atualizar usuário (exige autenticação)
    this.#router.put(
      "/:UsuarioCPF",
      AuthMiddleware.authenticate,
      this.#usuarioMiddleware.validateCpfParam,
      this.#usuarioMiddleware.validateUpdateBody,
      this.#usuarioControle.update
    );

    // PATCH /api/usuario/:UsuarioCPF/senha - Trocar a própria senha (exige autenticação)
    this.#router.patch(
      "/:UsuarioCPF/senha",
      AuthMiddleware.authenticate,
      this.#usuarioMiddleware.validateCpfParam,
      this.#usuarioMiddleware.validateSenhaBody,
      this.#usuarioControle.updateSenha
    );

    // DELETE /api/usuario/:UsuarioCPF - Deletar usuário (exige autenticação)
    this.#router.delete(
      "/:UsuarioCPF",
      AuthMiddleware.authenticate,
      this.#usuarioMiddleware.validateCpfParam,
      this.#usuarioControle.destroy
    );

    // GET /api/usuario - Listar usuários (com filtro opcional por nome)
    this.#router.get("/", this.#usuarioControle.index);

    // GET /api/usuario/:UsuarioCPF/escolas - Buscar escolas do usuário
    this.#router.get(
      "/:UsuarioCPF/escolas",
      this.#usuarioMiddleware.validateCpfParam,
      this.#escolaxUsuarioxFuncaoControle.getEscolasByUsuario
    );

    // POST /api/usuario/:UsuarioCPF/escolas/:EscolaGUID/acesso - Registrar último acesso do usuário na escola
    this.#router.post(
      "/:UsuarioCPF/escolas/:EscolaGUID/acesso",
      AuthMiddleware.authenticate,
      this.#usuarioMiddleware.validateCpfParam,
      this.#escolaxUsuarioxFuncaoControle.registrarAcesso
    );

    // GET /api/usuario/:UsuarioCPF - Buscar usuário por CPF
    this.#router.get(
      "/:UsuarioCPF",
      this.#usuarioMiddleware.validateCpfParam,
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
