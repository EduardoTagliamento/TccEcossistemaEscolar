/**
 * 🔒 Guard de Admin de Plataforma
 *
 * Protege rotas de nível de plataforma (CRUD do banco de questões
 * universal, fila de revisão de MateriaGlobal) — superfície de auth nova,
 * fora do EscolaXUsuarioXFuncao (spec item 13).
 *
 * Desvio deliberado do padrão descrito em `backend/guards/README.txt`
 * ("não acessa banco"): a flag `UsuarioIsPlataformaAdmin` não está no JWT
 * (evita que uma revogação de admin só tenha efeito depois do token
 * expirar/o usuário logar de novo) — por isso este guard consulta o banco
 * a cada request, igual o restante das checagens de permissão do projeto
 * (que hoje vivem na camada de service, ex. `MateriaService.validarPermissaoEscrita`).
 */

import { Request, Response, NextFunction } from "express";
import MysqlDatabase from "../database/MysqlDatabase";
import { UsuarioDAO } from "../repositories/usuario.repository";
import ErrorResponse from "../utils/ErrorResponse";

const usuarioDAO = new UsuarioDAO(MysqlDatabase.getInstance());

export const plataformaAdminGuard = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const usuarioCPF = req.user?.UsuarioCPF;
    if (!usuarioCPF) {
      throw new ErrorResponse(401, "Usuário não autenticado", {
        message: "É necessário estar autenticado para acessar este recurso.",
      });
    }

    const usuario = await usuarioDAO.findById(usuarioCPF);
    if (!usuario || !usuario.UsuarioIsPlataformaAdmin) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Este recurso é restrito a administradores de plataforma.",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
