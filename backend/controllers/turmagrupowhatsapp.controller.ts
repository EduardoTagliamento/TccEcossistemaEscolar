import { Request, Response } from "express";
import TurmaGrupoWhatsappService from "../services/turmagrupowhatsapp.service";
import ErrorResponse from "../utils/ErrorResponse";

/**
 * Controller para vínculo Turma ↔ grupo de WhatsApp — ver
 * docs/spec-resumo-ia-prova-grupo-whatsapp.md (repo interceptacaoAVA).
 */
export class TurmaGrupoWhatsappController {
  #turmaGrupoWhatsappService: TurmaGrupoWhatsappService;

  constructor(turmaGrupoWhatsappService: TurmaGrupoWhatsappService) {
    this.#turmaGrupoWhatsappService = turmaGrupoWhatsappService;
  }

  /** GET /api/turma/:guid/grupo-whatsapp — vínculo atual, ou null. */
  show = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const vinculo = await this.#turmaGrupoWhatsappService.buscarVinculo(guid);
      res.status(200).json({ success: true, message: "Vínculo consultado com sucesso", data: vinculo });
    } catch (error) {
      this.#tratarErro(res, error, "Erro interno ao consultar vínculo do grupo de WhatsApp");
    }
  };

  /** POST /api/turma/:guid/grupo-whatsapp/criar-automatico — cria o grupo com os alunos já com telefone. */
  criarAutomatico = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioGUID = req.user?.UsuarioGUID || "";
      const vinculo = await this.#turmaGrupoWhatsappService.criarGrupoAutomatico(guid, usuarioGUID);
      res.status(201).json({ success: true, message: "Grupo de WhatsApp criado com sucesso", data: vinculo });
    } catch (error) {
      this.#tratarErro(res, error, "Erro interno ao criar grupo de WhatsApp");
    }
  };

  /** GET /api/turma/:guid/grupo-whatsapp/disponiveis — grupos já existentes, pra vínculo manual. */
  listarDisponiveis = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioGUID = req.user?.UsuarioGUID || "";
      const grupos = await this.#turmaGrupoWhatsappService.listarGruposDisponiveis(guid, usuarioGUID);
      res.status(200).json({ success: true, message: "Grupos disponíveis listados com sucesso", data: grupos });
    } catch (error) {
      this.#tratarErro(res, error, "Erro interno ao listar grupos de WhatsApp disponíveis");
    }
  };

  /** POST /api/turma/:guid/grupo-whatsapp — vincula manualmente um grupo já existente. */
  vincular = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioGUID = req.user?.UsuarioGUID || "";
      const jid = req.body?.jid as string | undefined;

      if (!jid || typeof jid !== "string") {
        res.status(400).json({ success: false, message: "Campo 'jid' é obrigatório" });
        return;
      }

      const vinculo = await this.#turmaGrupoWhatsappService.vincularGrupoExistente(guid, jid, usuarioGUID);
      res.status(201).json({ success: true, message: "Grupo de WhatsApp vinculado com sucesso", data: vinculo });
    } catch (error) {
      this.#tratarErro(res, error, "Erro interno ao vincular grupo de WhatsApp");
    }
  };

  /** DELETE /api/turma/:guid/grupo-whatsapp — remove o vínculo. */
  desvincular = async (req: Request, res: Response): Promise<void> => {
    try {
      const { guid } = req.params;
      const usuarioGUID = req.user?.UsuarioGUID || "";
      await this.#turmaGrupoWhatsappService.desvincularGrupo(guid, usuarioGUID);
      res.status(200).json({ success: true, message: "Grupo de WhatsApp desvinculado com sucesso" });
    } catch (error) {
      this.#tratarErro(res, error, "Erro interno ao desvincular grupo de WhatsApp");
    }
  };

  #tratarErro(res: Response, error: unknown, mensagemGenerica: string): void {
    if (error instanceof ErrorResponse) {
      res.status(error.statusCode).json({ success: false, message: error.message });
    } else {
      console.error(mensagemGenerica + ":", error);
      res.status(500).json({ success: false, message: mensagemGenerica });
    }
  }
}
