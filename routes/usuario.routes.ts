import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import UsuarioControl from "../backend/controllers/usuario.controller";
import UsuarioMiddleware from "../backend/middlewares/usuario.middleware";
import UsuarioService from "../backend/services/usuario.service";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import EscolaxUsuarioxFuncaoControl from "../backend/controllers/escolaxusuarioxfuncao.controller";

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

    // PUT /api/usuario/:UsuarioCPF - Atualizar usuário
    this.#router.put(
      "/:UsuarioCPF",
      this.#usuarioMiddleware.validateCpfParam,
      this.#usuarioMiddleware.validateUpdateBody,
      this.#usuarioControle.update
    );

    // DELETE /api/usuario/:UsuarioCPF - Deletar usuário
    this.#router.delete(
      "/:UsuarioCPF",
      this.#usuarioMiddleware.validateCpfParam,
      this.#usuarioControle.destroy
    );

    // GET /api/usuario - Listar usuários (com filtro opcional por nome)
    this.#router.get("/", this.#usuarioControle.index);

    // GET /api/usuario/:cpf/escolas - Buscar escolas do usuário
    this.#router.get(
      "/:cpf/escolas",
      this.#usuarioMiddleware.validateCpfParam,
      this.#escolaxUsuarioxFuncaoControle.getEscolasByUsuario
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
  const EscolaxUsuarioxFuncaoService = require("../backend/services/escolaxusuarioxfuncao.service").default;
  
  const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(database);
  const escolaxUsuarioxFuncaoService = new EscolaxUsuarioxFuncaoService(escolaxUsuarioxFuncaoDAO);
  const escolaxUsuarioxFuncaoControle = new EscolaxUsuarioxFuncaoControl(escolaxUsuarioxFuncaoService);
  
  const roteador = new UsuarioRoteador(
    usuarioMiddleware,
    usuarioControle,
    escolaxUsuarioxFuncaoControle
  );

  return roteador.createRoutes();
};
