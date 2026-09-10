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
import { ConversaDAO } from "../backend/repositories/conversa.repository";
import { ConversaGrupoDAO } from "../backend/repositories/conversa-grupo.repository";
import { ConversaIndividualDAO } from "../backend/repositories/conversa-individual.repository";
import { MensagemDAO } from "../backend/repositories/mensagem.repository";

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

const chatbotService = new ChatbotService(
  usuarioDAO,
  tarefaService,
  materiaService,
  escolaxUsuarioxFuncaoService,
  calendarioService,
  conversaService
);
const chatbotControle = new ChatbotController(chatbotService);
const chatbotWebhookControle = new ChatbotWebhookController(chatbotService);

const chatbotRoteador = new ChatbotRoteador(chatbotControle, chatbotWebhookControle);
export const chatbotRoutes = chatbotRoteador.createRoutes();
