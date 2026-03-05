import { NextFunction, Request, Response } from "express";
import UsuarioService from "../services/usuario.service.js";

export default class UsuarioControl {
  #usuarioService: UsuarioService;

  constructor(usuarioServiceDependency: UsuarioService) {
    console.log("⬆️  UsuarioControl.constructor()");
    this.#usuarioService = usuarioServiceDependency;
  }

  store = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 UsuarioControl.store()");
    try {
      const jsonUsuario = request.body.usuario;
      const usuarioCriado = await this.#usuarioService.createUsuario(jsonUsuario);

      response.status(201).json({
        success: true,
        message: "Usuário cadastrado com sucesso",
        data: { usuario: usuarioCriado },
      });
    } catch (error) {
      next(error);
    }
  };

  index = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 UsuarioControl.index()");
    try {
      const nome = typeof request.query.nome === "string" ? request.query.nome : undefined;
      const usuarios = await this.#usuarioService.findAll(nome);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { usuarios },
      });
    } catch (error) {
      next(error);
    }
  };

  show = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 UsuarioControl.show()");
    try {
      const { UsuarioCPF } = request.params;
      const usuario = await this.#usuarioService.findById(UsuarioCPF);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { usuario },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 UsuarioControl.update()");
    try {
      const { UsuarioCPF } = request.params;
      const usuarioAtualizado = await this.#usuarioService.updateUsuario(UsuarioCPF, request.body.usuario);

      response.status(200).json({
        success: true,
        message: "Usuário atualizado com sucesso",
        data: { usuario: usuarioAtualizado },
      });
    } catch (error) {
      next(error);
    }
  };

  destroy = async (request: Request, response: Response, next: NextFunction) => {
    console.log("🔵 UsuarioControl.destroy()");
    try {
      const { UsuarioCPF } = request.params;
      const excluiu = await this.#usuarioService.deleteUsuario(UsuarioCPF);

      response.status(200).json({
        success: true,
        message: "Usuário excluído com sucesso",
        data: { deleted: excluiu },
      });
    } catch (error) {
      next(error);
    }
  };
}
