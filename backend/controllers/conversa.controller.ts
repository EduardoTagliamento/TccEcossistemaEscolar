import { Request, Response, NextFunction } from 'express';
import ConversaService from '../services/conversa.service';
import MensagemService from '../services/mensagem.service';
import ConversaIndividualService from '../services/conversa-individual.service';
import ConversaPermissaoService from '../services/conversa-permissao.service';
import ErrorResponse from '../utils/ErrorResponse';

export class ConversaController {
  #conversaService: ConversaService;
  #mensagemService: MensagemService;
  #conversaIndividualService: ConversaIndividualService;
  #conversaPermissaoService?: ConversaPermissaoService;

  constructor(
    conversaService: ConversaService,
    mensagemService: MensagemService,
    conversaIndividualService: ConversaIndividualService,
    conversaPermissaoService?: ConversaPermissaoService
  ) {
    console.log('⬆️  ConversaController.constructor()');
    this.#conversaService = conversaService;
    this.#mensagemService = mensagemService;
    this.#conversaIndividualService = conversaIndividualService;
    this.#conversaPermissaoService = conversaPermissaoService;
  }

  // GET /api/conversa
  index = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.index()');
    try {
      const usuarioCPF = req.user!.UsuarioCPF;
      const conversas = await this.#conversaService.listarConversas(usuarioCPF);
      res.status(200).json({ success: true, message: 'Conversas listadas', data: conversas });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/conversa/:guid
  show = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.show()');
    try {
      const { guid } = req.params;
      const usuarioCPF = req.user!.UsuarioCPF;
      const conversa = await this.#conversaService.buscarConversa(guid, usuarioCPF);
      res.status(200).json({ success: true, message: 'Conversa encontrada', data: conversa });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/conversa/:guid/mensagem?limit=30&before=<guid>
  listarMensagens = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.listarMensagens()');
    try {
      const { guid } = req.params;
      const usuarioCPF = req.user!.UsuarioCPF;
      const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
      const before = req.query.before as string | undefined;

      const resultado = await this.#mensagemService.listarHistorico(guid, usuarioCPF, limit, before);
      res.status(200).json({ success: true, message: 'Histórico carregado', data: resultado });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/conversa/individual
  storeIndividual = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.storeIndividual()');
    try {
      const remetenteCPF = req.user!.UsuarioCPF;
      const { DestinatarioCPF } = req.body;

      const resultado = await this.#conversaIndividualService.iniciarConversa(
        remetenteCPF,
        DestinatarioCPF
      );
      const status = resultado.isNova ? 201 : 200;
      res.status(status).json({
        success: true,
        message: resultado.isNova ? 'Conversa individual criada' : 'Conversa individual recuperada',
        data: resultado,
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/conversa/:guid/fixadas
  listarFixadas = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.listarFixadas()');
    try {
      const { guid } = req.params;
      const usuarioCPF = req.user!.UsuarioCPF;
      const fixadas = await this.#mensagemService.listarMensagensFixadas(guid, usuarioCPF);
      res.status(200).json({ success: true, message: 'Mensagens fixadas listadas', data: fixadas });
    } catch (error) {
      next(error);
    }
  };

  // POST /api/conversa/:guid/mensagem/:msgGuid/fixar
  pinMensagem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.pinMensagem()');
    try {
      const { guid, msgGuid } = req.params;
      const usuarioCPF = req.user!.UsuarioCPF;
      const dto = await this.#mensagemService.fixarMensagem(msgGuid, guid, usuarioCPF);
      res.status(201).json({ success: true, message: 'Mensagem fixada', data: dto });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/conversa/:guid/mensagem/:msgGuid/fixar
  unpinMensagem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.unpinMensagem()');
    try {
      const { guid, msgGuid } = req.params;
      const usuarioCPF = req.user!.UsuarioCPF;
      await this.#mensagemService.desafixarMensagem(msgGuid, guid, usuarioCPF);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/conversa/:guid/permissao/representante
  definirRepresentante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.definirRepresentante()');
    try {
      const { guid } = req.params;
      const { UsuarioCPF } = req.body;
      await this.#conversaPermissaoService!.definirRepresentante(guid, UsuarioCPF, req.user!.UsuarioCPF);
      res.status(200).json({ success: true, message: 'Representante definido' });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/conversa/:guid/permissao/representante
  removerRepresentante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.removerRepresentante()');
    try {
      const { guid } = req.params;
      await this.#conversaPermissaoService!.removerRepresentante(guid, req.user!.UsuarioCPF);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/conversa/:guid/permissao/vice-representante
  definirViceRepresentante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.definirViceRepresentante()');
    try {
      const { guid } = req.params;
      const { UsuarioCPF } = req.body;
      await this.#conversaPermissaoService!.definirViceRepresentante(guid, UsuarioCPF, req.user!.UsuarioCPF);
      res.status(200).json({ success: true, message: 'Vice-Representante definido' });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/conversa/:guid/permissao/vice-representante/:cpf
  removerViceRepresentante = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.removerViceRepresentante()');
    try {
      const { guid, cpf } = req.params;
      await this.#conversaPermissaoService!.removerViceRepresentante(guid, cpf, req.user!.UsuarioCPF);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/conversa/:guid/mensagem/:msgGuid
  deletarMensagem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.deletarMensagem()');
    try {
      const { guid, msgGuid } = req.params;
      await this.#mensagemService.deletarMensagem(msgGuid, guid, req.user!.UsuarioCPF);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/conversa/:guid/mensagem/:msgGuid
  editarMensagem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    console.log('🔵 ConversaController.editarMensagem()');
    try {
      const { guid, msgGuid } = req.params;
      const { MensagemConteudo } = req.body;
      const dto = await this.#mensagemService.editarMensagem(msgGuid, guid, req.user!.UsuarioCPF, MensagemConteudo);
      res.status(200).json({ success: true, message: 'Mensagem editada', data: dto });
    } catch (error) {
      next(error);
    }
  };
}
