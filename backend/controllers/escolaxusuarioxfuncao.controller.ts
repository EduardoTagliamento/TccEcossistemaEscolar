import { NextFunction, Request, Response } from "express";
import EscolaxUsuarioxFuncaoService from "../services/escolaxusuarioxfuncao.service";
import ErrorResponse from "../utils/ErrorResponse";

export default class EscolaxUsuarioxFuncaoControl {
  #service: EscolaxUsuarioxFuncaoService;

  constructor(serviceDependency: EscolaxUsuarioxFuncaoService) {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.constructor()");
    this.#service = serviceDependency;
  }

  store = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.store()");
    try {
      const payload = request.body.escolaxusuarioxfuncao;
      const relacao = await this.#service.createRelacao(payload, request.user?.UsuarioCPF);

      response.status(201).json({
        success: true,
        message: "Vinculo cadastrado com sucesso",
        data: { escolaxusuarioxfuncao: relacao },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/escolaxusuarioxfuncao/em-massa
   * Vincula em massa uma lista de CPFs de usuários já cadastrados a uma
   * função numa escola (importação via planilha em Secretaria/Coordenação).
   */
  storeEmMassa = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.storeEmMassa()");
    try {
      const { EscolaGUID, FuncaoId, itens } = request.body;
      const resultado = await this.#service.criarVinculosEmMassa(
        itens,
        EscolaGUID,
        Number(FuncaoId),
        request.user?.UsuarioCPF
      );

      response.status(201).json({
        success: true,
        message: `Processamento concluido: ${resultado.criados} criados, ${resultado.duplicados} duplicados, ${resultado.erros} erros`,
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  };

  index = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.index()");
    try {
      const filters = {
        UsuarioCPF:
          typeof request.query.UsuarioCPF === "string"
            ? request.query.UsuarioCPF
            : undefined,
        EscolaGUID:
          typeof request.query.EscolaGUID === "string"
            ? request.query.EscolaGUID
            : undefined,
        FuncaoId:
          typeof request.query.FuncaoId === "string"
            ? Number(request.query.FuncaoId)
            : undefined,
      };

      const relacoes = await this.#service.findAll(filters);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { escolaxusuarioxfuncaos: relacoes },
      });
    } catch (error) {
      next(error);
    }
  };

  show = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.show()");
    try {
      const id = Number(request.params.EscolaxUsuarioxFuncaoId);
      const relacao = await this.#service.findById(id);

      response.status(200).json({
        success: true,
        message: "Executado com sucesso",
        data: { escolaxusuarioxfuncao: relacao },
      });
    } catch (error) {
      next(error);
    }
  };

  update = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.update()");
    try {
      const id = Number(request.params.EscolaxUsuarioxFuncaoId);
      const payload = request.body.escolaxusuarioxfuncao;
      const relacao = await this.#service.updateRelacao(id, payload, request.user?.UsuarioCPF);

      response.status(200).json({
        success: true,
        message: "Vinculo atualizado com sucesso",
        data: { escolaxusuarioxfuncao: relacao },
      });
    } catch (error) {
      next(error);
    }
  };

  destroy = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.destroy()");
    try {
      const id = Number(request.params.EscolaxUsuarioxFuncaoId);
      const deleted = await this.#service.deleteRelacao(id, request.user?.UsuarioCPF);

      response.status(200).json({
        success: true,
        message: "Vinculo excluido com sucesso",
        data: { deleted },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/usuario/:cpf/escolas
   * Retorna todas as escolas vinculadas ao usuário com suas funções
   */
  getEscolasByUsuario = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.getEscolasByUsuario()");
    try {
      const UsuarioCPF = request.params.UsuarioCPF;

      // Busca as escolas normalmente
      const escolas = await this.#service.findEscolasByUsuario(UsuarioCPF);

      // Sempre retorna 200, mesmo se lista vazia
      response.status(200).json({
        success: true,
        message: escolas.length === 0
          ? "Nenhuma escola vinculada ao usuário."
          : "Escolas do usuario obtidas com sucesso",
        data: { escolas },
      });
    } catch (error) {
      // Só lança erro se for erro de parâmetro ou exceção real
      next(error);
    }
  };

  /**
   * POST /api/usuario/:UsuarioCPF/escolas/:EscolaGUID/acesso
   * Registra o "último acesso" do usuário autenticado nesta escola (não é
   * auditoria — ver docs/PLANO_IMPLEMENTACAO_REGISTRO_AUDITORIA.md, Seção
   * 3.4). Só o próprio usuário pode atualizar seu próprio registro.
   */
  registrarAcesso = async (request: Request, response: Response, next: NextFunction) => {
    console.log("Controller: EscolaxUsuarioxFuncaoControl.registrarAcesso()");
    try {
      const { UsuarioCPF, EscolaGUID } = request.params;
      const usuarioAutenticado = request.user?.UsuarioCPF;

      if (!usuarioAutenticado) {
        throw new ErrorResponse(401, "Não autenticado");
      }
      if (usuarioAutenticado !== UsuarioCPF) {
        throw new ErrorResponse(403, "Sem permissão", {
          message: "Só é possível registrar o próprio acesso.",
        });
      }

      await this.#service.registrarAcesso(UsuarioCPF, EscolaGUID);

      response.status(200).json({
        success: true,
        message: "Acesso registrado com sucesso",
        data: {},
      });
    } catch (error) {
      next(error);
    }
  };
}
