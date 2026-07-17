import { Router } from 'express';
import MysqlDatabase from '../backend/database/MysqlDatabase';
import { ConversaDAO } from '../backend/repositories/conversa.repository';
import { ConversaGrupoDAO } from '../backend/repositories/conversa-grupo.repository';
import { ConversaIndividualDAO } from '../backend/repositories/conversa-individual.repository';
import { MensagemDAO } from '../backend/repositories/mensagem.repository';
import { TurmaDAO } from '../backend/repositories/turma.repository';
import { EscolaxUsuarioxFuncaoDAO } from '../backend/repositories/escolaxusuarioxfuncao.repository';
import ConversaService from '../backend/services/conversa.service';
import MensagemService from '../backend/services/mensagem.service';
import ConversaIndividualService from '../backend/services/conversa-individual.service';
import ConversaPermissaoService from '../backend/services/conversa-permissao.service';
import { ConversaController } from '../backend/controllers/conversa.controller';
import { ConversaMiddleware } from '../backend/middlewares/conversa.middleware';
import { AuthMiddleware } from '../backend/middlewares/auth.middleware';

export function conversaRouterFactory(): Router {
  const router = Router();

  const db = new MysqlDatabase();
  const conversaDAO = new ConversaDAO(db);
  const conversaGrupoDAO = new ConversaGrupoDAO(db);
  const conversaIndividualDAO = new ConversaIndividualDAO(db);
  const mensagemDAO = new MensagemDAO(db);
  const turmaDAO = new TurmaDAO(db);
  const escolaFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(db);

  const conversaService = new ConversaService(
    conversaDAO,
    conversaGrupoDAO,
    conversaIndividualDAO,
    mensagemDAO
  );
  const mensagemService = new MensagemService(mensagemDAO, conversaGrupoDAO, conversaDAO);
  const conversaIndividualService = new ConversaIndividualService(conversaDAO, conversaIndividualDAO);
  const conversaPermissaoService = new ConversaPermissaoService(conversaGrupoDAO, turmaDAO, escolaFuncaoDAO);

  const controller = new ConversaController(
    conversaService,
    mensagemService,
    conversaIndividualService,
    conversaPermissaoService
  );

  // Todas as rotas requerem autenticação
  router.use(AuthMiddleware.authenticate);

  // IMPORTANTE: rota literal /individual deve vir ANTES de /:guid para evitar colisão
  // POST /api/conversa/individual — inicia ou recupera conversa 1:1 (idempotente)
  router.post(
    '/individual',
    ConversaMiddleware.validarIniciarIndividual,
    controller.storeIndividual
  );

  // GET /api/conversa — lista conversas ativas do usuário (grupos + individuais)
  router.get('/', controller.index);

  // GET /api/conversa/:guid — detalhes + últimas 30 mensagens + fixadas
  router.get('/:guid', ConversaMiddleware.validarGUID, controller.show);

  // GET /api/conversa/:guid/mensagem?limit=30&before=<guid> — histórico paginado
  router.get('/:guid/mensagem', ConversaMiddleware.validarGUID, controller.listarMensagens);

  // GET /api/conversa/:guid/fixadas — lista mensagens fixadas da conversa
  router.get('/:guid/fixadas', ConversaMiddleware.validarGUID, controller.listarFixadas);

  // POST /api/conversa/:guid/mensagem/:msgGuid/fixar — fixa mensagem
  router.post(
    '/:guid/mensagem/:msgGuid/fixar',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarMsgGUID,
    controller.pinMensagem
  );

  // DELETE /api/conversa/:guid/mensagem/:msgGuid/fixar — desafixa mensagem
  router.delete(
    '/:guid/mensagem/:msgGuid/fixar',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarMsgGUID,
    controller.unpinMensagem
  );

  // DELETE /api/conversa/:guid/mensagem/:msgGuid — deleta mensagem (soft)
  router.delete(
    '/:guid/mensagem/:msgGuid',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarMsgGUID,
    controller.deletarMensagem
  );

  // PATCH /api/conversa/:guid/mensagem/:msgGuid — edita mensagem
  router.patch(
    '/:guid/mensagem/:msgGuid',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarMsgGUID,
    ConversaMiddleware.validarEditarBody,
    controller.editarMensagem
  );

  // PUT /api/conversa/:guid/permissao/representante — define representante (Turma; Coord/Dir only)
  router.put(
    '/:guid/permissao/representante',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarCPFBody,
    controller.definirRepresentante
  );

  // DELETE /api/conversa/:guid/permissao/representante — remove representante (Turma; Coord/Dir only)
  router.delete(
    '/:guid/permissao/representante',
    ConversaMiddleware.validarGUID,
    controller.removerRepresentante
  );

  // PUT /api/conversa/:guid/permissao/vice-representante — define vice (Representante/Líder only)
  router.put(
    '/:guid/permissao/vice-representante',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarCPFBody,
    controller.definirViceRepresentante
  );

  // DELETE /api/conversa/:guid/permissao/vice-representante/:cpf — remove vice (Representante/Líder only)
  router.delete(
    '/:guid/permissao/vice-representante/:cpf',
    ConversaMiddleware.validarGUID,
    ConversaMiddleware.validarCPFParam,
    controller.removerViceRepresentante
  );

  return router;
}
