import { Router } from "express";
import MysqlDatabase from "../backend/database/MysqlDatabase";
import ChatbotController from "../backend/controllers/chatbot.controller";
import ChatbotWebhookController from "../backend/controllers/chatbotWebhook.controller";
import ChatbotService from "../backend/services/chatbot.service";
import { UsuarioDAO } from "../backend/repositories/usuario.repository";
import { EscolaDAO } from "../backend/repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../backend/repositories/escolaxusuarioxfuncao.repository";
import { UsuarioxEscolaAcessoDAO } from "../backend/repositories/usuarioxescolaacesso.repository";
import EscolaxUsuarioxFuncaoService from "../backend/services/escolaxusuarioxfuncao.service";
import TarefaAcademicaService from "../backend/services/tarefaacademica.service";
import { TarefaAcademicaDAO } from "../backend/repositories/tarefaacademica.repository";
import { TarefaAcademicaMatriculaDAO } from "../backend/repositories/tarefaacademica-matricula.repository";
import { AnexoDAO } from "../backend/repositories/anexo.repository";
import { MatriculaDAO } from "../backend/repositories/matricula.repository";
import { CategoriaConteudoDAO } from "../backend/repositories/categoriaconteudo.repository";
import { MaterialProfessorTurmaDAO } from "../backend/repositories/materiaxprofessorxturma.repository";
import { TarefaAcademicaQuestaoDAO } from "../backend/repositories/tarefaacademica-questao.repository";
import { TarefaAcademicaAlternativaDAO } from "../backend/repositories/tarefaacademica-alternativa.repository";
import { TarefaAcademicaRespostaDAO } from "../backend/repositories/tarefaacademica-resposta.repository";
import MateriaService from "../backend/services/materia.service";
import { MateriaDAO } from "../backend/repositories/materia.repository";
import { CursoDAO } from "../backend/repositories/curso.repository";
import { MateriaCustomizacaoDAO } from "../backend/repositories/materiacustomizacao.repository";
import CalendarioService from "../backend/services/calendario.service";
import { CalendarioDAO } from "../backend/repositories/calendario.repository";
import ConversaService from "../backend/services/conversa.service";
import MensagemService from "../backend/services/mensagem.service";
import { ConversaDAO } from "../backend/repositories/conversa.repository";
import { ConversaGrupoDAO } from "../backend/repositories/conversa-grupo.repository";
import { ConversaIndividualDAO } from "../backend/repositories/conversa-individual.repository";
import { MensagemDAO } from "../backend/repositories/mensagem.repository";
import ConteudoService from "../backend/services/conteudo.service";
import { ConteudoDAO } from "../backend/repositories/conteudo.repository";
import ConteudoTurmaDAO from "../backend/repositories/conteudoturma.repository";
import { ConteudoCronometradoDAO } from "../backend/repositories/conteudocronometrado.repository";
import { ConteudoTextoDAO } from "../backend/repositories/conteudotexto.repository";
import { ConteudoPaginadoArquivoDAO } from "../backend/repositories/conteudopaginadoarquivo.repository";
import { TurmaDAO } from "../backend/repositories/turma.repository";
import { AvisoService } from "../backend/services/aviso.service";
import { AvisoDAO } from "../backend/repositories/aviso.repository";
import { RelacaoAnexosDAO } from "../backend/repositories/relacaoanexos.repository";
import AnexoService from "../backend/services/anexo.service";
import NotificacaoService from "../backend/services/notificacao.service";
import { NotificacaoDAO } from "../backend/repositories/notificacao.repository";
import { NotificacaoTipoDAO } from "../backend/repositories/notificacaotipo.repository";
import { UsuarioNotificacaoPreferenciaDAO } from "../backend/repositories/usuarionotificacaopreferencia.repository";
import { NotificacaoEnvioDAO } from "../backend/repositories/notificacaoenvio.repository";
import { AnotacaoService } from "../backend/services/anotacao.service";
import { AnotacaoDAO } from "../backend/repositories/anotacao.repository";
import ProjetoService from "../backend/services/projeto.service";
import { ProjetoDAO } from "../backend/repositories/projeto.repository";
import CategoriaConteudoService from "../backend/services/categoriaconteudo.service";
import PendenciaService from "../backend/services/pendencia.service";
import { PendenciaDAO } from "../backend/repositories/pendencia.repository";
import GrupoTarefaService from "../backend/services/grupotarefa.service";
import HistoricoGrupoTarefaService from "../backend/services/historicogrupotarefa.service";
import { GrupoTarefaDAO } from "../backend/repositories/grupotarefa.repository";
import { UsuarioXGrupoTarefaDAO } from "../backend/repositories/usuarioxgrupotarefa.repository";
import { HistoricoGrupoTarefaDAO } from "../backend/repositories/historicogrupotarefa.repository";

export default class ChatbotRoteador {
  #router: Router;
  #controle: ChatbotController;
  #webhookControle: ChatbotWebhookController;

  constructor(controle: ChatbotController, webhookControle: ChatbotWebhookController) {
    console.log("⬆️  ChatbotRoteador.constructor()");
    this.#router = Router();
    this.#controle = controle;
    this.#webhookControle = webhookControle;
  }

  createRoutes = (): Router => {
    console.log("⬆️  ChatbotRoteador.createRoutes()");

    // POST /api/chatbot/mensagem — sem AuthMiddleware de propósito, ver
    // controller/service (identidade resolvida por telefone dentro da
    // própria conversa, não por JWT).
    this.#router.post("/mensagem", this.#controle.enviarMensagem);

    // POST /api/chatbot/webhook/whatsapp/:segredo — recebido pela Evolution
    // API a cada mensagem no número pareado. Sem AuthMiddleware; protegido
    // pelo segredo no path (CHATBOT_WHATSAPP_WEBHOOK_SECRET).
    this.#router.post("/webhook/whatsapp/:segredo", this.#webhookControle.receberWhatsapp);

    return this.#router;
  };
}

// ========== Instanciação e Injeção de Dependências ==========
const db = MysqlDatabase.getInstance();

const usuarioDAO = new UsuarioDAO(db);
const escolaDAO = new EscolaDAO(db);
const escolaxUsuarioxFuncaoDAO = new EscolaxUsuarioxFuncaoDAO(db);
const usuarioxEscolaAcessoDAO = new UsuarioxEscolaAcessoDAO(db);
const escolaxUsuarioxFuncaoService = new EscolaxUsuarioxFuncaoService(
  escolaxUsuarioxFuncaoDAO,
  usuarioxEscolaAcessoDAO,
  usuarioDAO,
  escolaDAO
);

const tarefaDAO = new TarefaAcademicaDAO(db);
const tarefaMatriculaDAO = new TarefaAcademicaMatriculaDAO(db);
const anexoDAO = new AnexoDAO(db);
const matriculaDAO = new MatriculaDAO(db);
const categoriaDAO = new CategoriaConteudoDAO(db);
const alocacaoDAO = new MaterialProfessorTurmaDAO(db);
const questaoDAO = new TarefaAcademicaQuestaoDAO(db);
const alternativaDAO = new TarefaAcademicaAlternativaDAO(db);
const respostaDAO = new TarefaAcademicaRespostaDAO(db);
const tarefaService = new TarefaAcademicaService(
  tarefaDAO,
  tarefaMatriculaDAO,
  anexoDAO,
  matriculaDAO,
  categoriaDAO,
  alocacaoDAO,
  questaoDAO,
  alternativaDAO,
  respostaDAO,
  usuarioDAO
);

const materiaDAO = new MateriaDAO(db);
const cursoDAO = new CursoDAO(db);
const customizacaoDAO = new MateriaCustomizacaoDAO(db);
const materiaService = new MateriaService(
  materiaDAO,
  escolaDAO,
  escolaxUsuarioxFuncaoDAO,
  cursoDAO,
  matriculaDAO,
  alocacaoDAO,
  customizacaoDAO,
  usuarioDAO
);

const calendarioDAO = new CalendarioDAO(db);
const calendarioService = new CalendarioService(calendarioDAO, escolaxUsuarioxFuncaoDAO, usuarioDAO);

const conversaDAO = new ConversaDAO(db);
const conversaGrupoDAO = new ConversaGrupoDAO(db);
const conversaIndividualDAO = new ConversaIndividualDAO(db);
const mensagemDAO = new MensagemDAO(db);
const conversaService = new ConversaService(conversaDAO, conversaGrupoDAO, conversaIndividualDAO, mensagemDAO, usuarioDAO);
const mensagemService = new MensagemService(mensagemDAO, conversaGrupoDAO, conversaDAO, usuarioDAO);

const turmaDAO = new TurmaDAO(db);
const conteudoDAO = new ConteudoDAO(db);
const conteudoTurmaDAO = new ConteudoTurmaDAO(db);
const conteudoCronometradoDAO = new ConteudoCronometradoDAO(db);
const conteudoTextoDAO = new ConteudoTextoDAO(db);
const conteudoPaginadoArquivoDAO = new ConteudoPaginadoArquivoDAO(db);
const conteudoService = new ConteudoService(
  conteudoDAO,
  conteudoTurmaDAO,
  conteudoCronometradoDAO,
  conteudoTextoDAO,
  conteudoPaginadoArquivoDAO,
  materiaDAO,
  turmaDAO,
  categoriaDAO,
  alocacaoDAO,
  usuarioDAO
);

const avisoDAO = new AvisoDAO(db);
const relacaoAnexosDAO = new RelacaoAnexosDAO(db);
const avisoService = new AvisoService(avisoDAO, escolaxUsuarioxFuncaoDAO, relacaoAnexosDAO, anexoDAO, matriculaDAO, usuarioDAO);

const anexoService = new AnexoService(anexoDAO, escolaDAO, escolaxUsuarioxFuncaoDAO, usuarioDAO);

const notificacaoDAO = new NotificacaoDAO(db);
const notificacaoTipoDAO = new NotificacaoTipoDAO(db);
const usuarioNotificacaoPreferenciaDAO = new UsuarioNotificacaoPreferenciaDAO(db);
const notificacaoEnvioDAO = new NotificacaoEnvioDAO(db);
const notificacaoService = new NotificacaoService(
  notificacaoDAO,
  notificacaoTipoDAO,
  usuarioNotificacaoPreferenciaDAO,
  notificacaoEnvioDAO,
  usuarioDAO
);

const anotacaoDAO = new AnotacaoDAO(db);
const anotacaoService = new AnotacaoService(anotacaoDAO, escolaxUsuarioxFuncaoDAO);

const projetoDAO = new ProjetoDAO(db);
const projetoService = new ProjetoService(projetoDAO, turmaDAO, matriculaDAO, escolaxUsuarioxFuncaoDAO, usuarioDAO);

const categoriaConteudoService = new CategoriaConteudoService(
  categoriaDAO,
  materiaDAO,
  turmaDAO,
  usuarioDAO,
  matriculaDAO,
  respostaDAO
);

const pendenciaDAO = new PendenciaDAO(db);
const pendenciaService = new PendenciaService(pendenciaDAO, usuarioDAO, escolaDAO, escolaxUsuarioxFuncaoDAO);

const grupoTarefaDAO = new GrupoTarefaDAO(db);
const usuarioXGrupoTarefaDAO = new UsuarioXGrupoTarefaDAO(db);
const historicoGrupoTarefaDAO = new HistoricoGrupoTarefaDAO(db);
const historicoGrupoTarefaService = new HistoricoGrupoTarefaService(historicoGrupoTarefaDAO);
const grupoTarefaService = new GrupoTarefaService(
  grupoTarefaDAO,
  usuarioXGrupoTarefaDAO,
  tarefaDAO,
  matriculaDAO,
  tarefaMatriculaDAO,
  usuarioDAO,
  historicoGrupoTarefaService,
  db
);

const chatbotService = new ChatbotService(
  usuarioDAO,
  tarefaService,
  materiaService,
  escolaxUsuarioxFuncaoService,
  calendarioService,
  conversaService,
  mensagemService,
  conteudoService,
  avisoService,
  anexoService,
  notificacaoService,
  anotacaoService,
  projetoService,
  categoriaConteudoService,
  pendenciaService,
  grupoTarefaService,
  alocacaoDAO,
  matriculaDAO,
  materiaDAO,
  turmaDAO
);
const chatbotControle = new ChatbotController(chatbotService);
const chatbotWebhookControle = new ChatbotWebhookController(chatbotService);

const chatbotRoteador = new ChatbotRoteador(chatbotControle, chatbotWebhookControle);
export const chatbotRoutes = chatbotRoteador.createRoutes();
