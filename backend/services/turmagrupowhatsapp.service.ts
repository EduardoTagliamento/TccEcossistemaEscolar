import { RowDataPacket } from "mysql2";
import { gerarGUID } from "../utils/helpers/guid.helper";
import { paraFormatoEvolutionApi } from "../utils/helpers/telefone.helper";
import MysqlDatabase from "../database/MysqlDatabase";
import ErrorResponse from "../utils/ErrorResponse";
import TurmaGrupoWhatsapp from "../entities/turmagrupowhatsapp.model";
import { TurmaGrupoWhatsappDAO } from "../repositories/turmagrupowhatsapp.repository";
import { TurmaDAO } from "../repositories/turma.repository";
import { UsuarioDAO } from "../repositories/usuario.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ConversaGrupoService from "./conversa-grupo.service";
import EvolutionApiService, { GrupoWhatsapp } from "../external/EvolutionApiService";

interface AlunoTelefoneRow extends RowDataPacket {
  UsuarioGUID: string;
  UsuarioTelefone: string | null;
}

export interface GrupoWhatsappSugestao extends GrupoWhatsapp {
  /** 0-1, similaridade do nome do grupo com TurmaSerie+TurmaNome — maior primeiro. */
  similaridade: number;
}

export interface TurmaGrupoWhatsappDTO {
  TurmaGrupoWhatsappGUID: string;
  TurmaGUID: string;
  GrupoWhatsappJID: string;
  CriadoPorBaua: boolean;
  CriadoPorUsuarioGUID: string;
  CreatedAt: string;
  UpdatedAt: string;
}

/**
 * Vínculo Turma ↔ grupo de WhatsApp, criação automática de grupo, e
 * sincronização de membros (adicionar/remover conforme matrícula muda ou
 * telefone é cadastrado depois). Ver
 * docs/spec-resumo-ia-prova-grupo-whatsapp.md (repo interceptacaoAVA).
 *
 * Modelo de permissão espelha `TurmaService.validarPermissaoCapaTurma`:
 * Representante/Vice-Representante do grupo de conversa (chat interno) da
 * turma, OU Coordenação/Direção ativa na escola.
 */
export default class TurmaGrupoWhatsappService {
  #turmaGrupoWhatsappDAO: TurmaGrupoWhatsappDAO;
  #turmaDAO: TurmaDAO;
  #usuarioDAO: UsuarioDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;
  #database: MysqlDatabase;
  #conversaGrupoService?: ConversaGrupoService;
  #evolutionApiService: EvolutionApiService;

  constructor(
    turmaGrupoWhatsappDAO: TurmaGrupoWhatsappDAO,
    turmaDAO: TurmaDAO,
    usuarioDAO: UsuarioDAO,
    escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO,
    database: MysqlDatabase,
    conversaGrupoService?: ConversaGrupoService,
    evolutionApiService: EvolutionApiService = EvolutionApiService.getInstance()
  ) {
    console.log("⬆️  TurmaGrupoWhatsappService.constructor()");
    this.#turmaGrupoWhatsappDAO = turmaGrupoWhatsappDAO;
    this.#turmaDAO = turmaDAO;
    this.#usuarioDAO = usuarioDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
    this.#database = database;
    this.#conversaGrupoService = conversaGrupoService;
    this.#evolutionApiService = evolutionApiService;
  }

  // ==================== CRIAÇÃO AUTOMÁTICA ====================

  /**
   * Cria o grupo de WhatsApp da turma com os alunos matriculados ativos que
   * já têm telefone cadastrado (quem não tem entra depois, via
   * `sincronizarMembro` quando o telefone for preenchido — ver §5 da spec).
   * Ação manual (botão na gestão da turma) — nunca automática na criação
   * da turma ou na primeira matrícula.
   */
  criarGrupoAutomatico = async (turmaGUID: string, usuarioGUIDAtor: string): Promise<TurmaGrupoWhatsappDTO> => {
    console.log("🟣 TurmaGrupoWhatsappService.criarGrupoAutomatico()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", { message: "Turma vinculada não existe" });
    }

    await this.validarPermissao(turmaGUID, usuarioGUIDAtor, turma.EscolaGUID);

    const existente = await this.#turmaGrupoWhatsappDAO.findByTurma(turmaGUID);
    if (existente) {
      throw new ErrorResponse(400, "Turma já tem grupo vinculado", {
        message: "Essa turma já tem um grupo de WhatsApp vinculado — desvincule antes de criar outro.",
      });
    }

    const alunos = await this.buscarAlunosAtivosComTelefone(turmaGUID);
    if (alunos.length === 0) {
      throw new ErrorResponse(400, "Nenhum aluno com telefone cadastrado", {
        message: "A turma não tem nenhum aluno matriculado com telefone cadastrado ainda — cadastre pelo menos um telefone antes de criar o grupo.",
      });
    }

    const telefones = alunos.map((a: AlunoTelefoneRow) => paraFormatoEvolutionApi(a.UsuarioTelefone!));
    const nomeGrupo = `${turma.TurmaSerie} ${turma.TurmaNome}`.trim();
    const { jid } = await this.#evolutionApiService.criarGrupo(nomeGrupo, telefones);

    const vinculo = new TurmaGrupoWhatsapp();
    vinculo.TurmaGrupoWhatsappGUID = gerarGUID();
    vinculo.TurmaGUID = turmaGUID;
    vinculo.GrupoWhatsappJID = jid;
    vinculo.CriadoPorBaua = true;
    vinculo.CriadoPorUsuarioGUID = usuarioGUIDAtor;
    vinculo.validar();

    await this.#turmaGrupoWhatsappDAO.create(vinculo);

    this.mandarMensagemApresentacao(jid).catch((erro: unknown) => {
      console.error("🔴 TurmaGrupoWhatsappService: falha ao mandar mensagem de apresentação (não bloqueia a criação):", erro);
    });

    return this.toDTO(vinculo);
  };

  // ==================== VÍNCULO MANUAL (FALLBACK) ====================

  /**
   * Lista os grupos em que o BAUÁ está presente no WhatsApp e ainda não
   * estão vinculados a nenhuma turma, ordenados por similaridade de nome
   * com a turma (facilita achar o certo — a escolha final é sempre humana).
   */
  listarGruposDisponiveis = async (turmaGUID: string, usuarioGUIDAtor: string): Promise<GrupoWhatsappSugestao[]> => {
    console.log("🟣 TurmaGrupoWhatsappService.listarGruposDisponiveis()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", { message: "Turma vinculada não existe" });
    }
    await this.validarPermissao(turmaGUID, usuarioGUIDAtor, turma.EscolaGUID);

    const todos = await this.#evolutionApiService.listarGrupos();
    const nomeTurma = `${turma.TurmaSerie} ${turma.TurmaNome}`.trim();

    const disponiveis: GrupoWhatsappSugestao[] = [];
    for (const grupo of todos) {
      const jaVinculado = await this.#turmaGrupoWhatsappDAO.findByJid(grupo.jid);
      if (jaVinculado) continue;
      disponiveis.push({ ...grupo, similaridade: this.#similaridade(nomeTurma, grupo.nome) });
    }

    return disponiveis.sort((a, b) => b.similaridade - a.similaridade);
  };

  /**
   * Vincula manualmente um grupo já existente a uma turma. Nunca sobrescreve
   * um vínculo existente — precisa desvincular antes (§ decisão da spec:
   * reduz risco de vincular errado por engano).
   */
  vincularGrupoExistente = async (
    turmaGUID: string,
    grupoWhatsappJID: string,
    usuarioGUIDAtor: string
  ): Promise<TurmaGrupoWhatsappDTO> => {
    console.log("🟣 TurmaGrupoWhatsappService.vincularGrupoExistente()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", { message: "Turma vinculada não existe" });
    }
    await this.validarPermissao(turmaGUID, usuarioGUIDAtor, turma.EscolaGUID);

    const turmaJaTemGrupo = await this.#turmaGrupoWhatsappDAO.findByTurma(turmaGUID);
    if (turmaJaTemGrupo) {
      throw new ErrorResponse(400, "Turma já tem grupo vinculado", {
        message: "Desvincule o grupo atual antes de vincular outro.",
      });
    }

    const grupoJaVinculado = await this.#turmaGrupoWhatsappDAO.findByJid(grupoWhatsappJID);
    if (grupoJaVinculado) {
      throw new ErrorResponse(400, "Grupo já vinculado a outra turma", {
        message: "Esse grupo já está vinculado a outra turma — um grupo só pode pertencer a uma turma.",
      });
    }

    const vinculo = new TurmaGrupoWhatsapp();
    vinculo.TurmaGrupoWhatsappGUID = gerarGUID();
    vinculo.TurmaGUID = turmaGUID;
    vinculo.GrupoWhatsappJID = grupoWhatsappJID;
    vinculo.CriadoPorBaua = false;
    vinculo.CriadoPorUsuarioGUID = usuarioGUIDAtor;
    vinculo.validar();

    await this.#turmaGrupoWhatsappDAO.create(vinculo);
    return this.toDTO(vinculo);
  };

  /** Remove o vínculo — pré-requisito pra vincular outro grupo à mesma turma. */
  desvincularGrupo = async (turmaGUID: string, usuarioGUIDAtor: string): Promise<void> => {
    console.log("🟣 TurmaGrupoWhatsappService.desvincularGrupo()");

    const turma = await this.#turmaDAO.findById(turmaGUID);
    if (!turma) {
      throw new ErrorResponse(404, "Turma não encontrada", { message: "Turma vinculada não existe" });
    }
    await this.validarPermissao(turmaGUID, usuarioGUIDAtor, turma.EscolaGUID);

    const removido = await this.#turmaGrupoWhatsappDAO.deleteByTurma(turmaGUID);
    if (!removido) {
      throw new ErrorResponse(404, "Vínculo não encontrado", { message: "Essa turma não tem grupo vinculado." });
    }
  };

  buscarVinculo = async (turmaGUID: string): Promise<TurmaGrupoWhatsappDTO | null> => {
    console.log("🟣 TurmaGrupoWhatsappService.buscarVinculo()");
    const vinculo = await this.#turmaGrupoWhatsappDAO.findByTurma(turmaGUID);
    return vinculo ? this.toDTO(vinculo) : null;
  };

  // ==================== SINCRONIZAÇÃO DE MEMBROS ====================

  /**
   * Adiciona ou remove um aluno do grupo de WhatsApp da turma, espelhando
   * os gatilhos que `ConversaGrupoService.adicionarMembroTurma`/
   * `.removerMembroTurma` já usam (matrícula criada/transferida/encerrada/
   * em massa — ver §5 da spec). Sempre "nunca lança erro pro chamador":
   * chamado como efeito colateral de operações de matrícula que não podem
   * falhar por causa do WhatsApp.
   *
   * Sem grupo vinculado pra essa turma, ou (no caso "adicionar") sem
   * telefone cadastrado ainda: no-op silencioso — não é erro, só ainda não
   * há nada a fazer (o telefone preenchido depois dispara a sincronização
   * de novo, ver `sincronizarMembroPorTelefonePreenchido`).
   */
  sincronizarMembro = async (turmaGUID: string, usuarioGUID: string, acao: "adicionar" | "remover"): Promise<void> => {
    try {
      const vinculo = await this.#turmaGrupoWhatsappDAO.findByTurma(turmaGUID);
      if (!vinculo) return;

      const usuario = await this.#usuarioDAO.findByGUID(usuarioGUID);
      if (!usuario?.UsuarioTelefone) return;

      const telefone = paraFormatoEvolutionApi(usuario.UsuarioTelefone);
      if (acao === "adicionar") {
        await this.#evolutionApiService.adicionarParticipante(vinculo.GrupoWhatsappJID, telefone);
      } else {
        await this.#evolutionApiService.removerParticipante(vinculo.GrupoWhatsappJID, telefone);
      }
    } catch (erro) {
      console.error(
        `🔴 TurmaGrupoWhatsappService.sincronizarMembro() falhou (turma=${turmaGUID}, usuario=${usuarioGUID}, acao=${acao}):`,
        erro
      );
    }
  };

  /**
   * Gatilho específico pra quando o telefone de um usuário é preenchido
   * (estava vazio/nulo, passou a ter valor) — cobre o caso "aluno entrou
   * na turma sem telefone (matrícula em massa por planilha, por exemplo),
   * telefone foi cadastrado depois". Busca as matrículas ativas do usuário
   * e sincroniza (adiciona) em cada turma com grupo vinculado.
   */
  sincronizarMembroPorTelefonePreenchido = async (usuarioGUID: string): Promise<void> => {
    try {
      const pool = await this.#database.getPool();
      const [rows] = await pool.execute<RowDataPacket[]>(
        `SELECT TurmaGUID FROM matricula WHERE UsuarioGUID = ? AND MatriculaStatus = 'Ativa' AND TurmaGUID IS NOT NULL`,
        [usuarioGUID]
      );

      for (const row of rows as { TurmaGUID: string }[]) {
        await this.sincronizarMembro(row.TurmaGUID, usuarioGUID, "adicionar");
      }
    } catch (erro) {
      console.error(
        `🔴 TurmaGrupoWhatsappService.sincronizarMembroPorTelefonePreenchido() falhou (usuario=${usuarioGUID}):`,
        erro
      );
    }
  };

  // ==================== PRIVADOS ====================

  /** Representante/Vice-Representante do grupo de conversa da turma, OU Coordenação/Direção ativa na escola. */
  private async validarPermissao(turmaGUID: string, usuarioGUID: string, escolaGUID: string): Promise<void> {
    if (this.#conversaGrupoService) {
      const funcao = await this.#conversaGrupoService.getFuncaoNaTurma(turmaGUID, usuarioGUID);
      if (funcao === "Representante" || funcao === "Vice-Representante") {
        return;
      }
    }

    const coordenacao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(usuarioGUID, escolaGUID, 1);
    if (coordenacao && coordenacao.Status === "Ativo") return;

    const direcao = await this.#escolaxUsuarioxFuncaoDAO.findByTripla(usuarioGUID, escolaGUID, 6);
    if (direcao && direcao.Status === "Ativo") return;

    throw new ErrorResponse(403, "Sem permissão", {
      message: "Só o representante/vice-representante da turma ou Coordenação/Direção podem gerenciar o grupo de WhatsApp.",
    });
  }

  private async buscarAlunosAtivosComTelefone(turmaGUID: string): Promise<AlunoTelefoneRow[]> {
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<AlunoTelefoneRow[]>(
      `
        SELECT u.UsuarioGUID, u.UsuarioTelefone
        FROM matricula m
        INNER JOIN usuario u ON u.UsuarioGUID = m.UsuarioGUID
        WHERE m.TurmaGUID = ? AND m.MatriculaStatus = 'Ativa' AND u.UsuarioTelefone IS NOT NULL
      `,
      [turmaGUID]
    );
    return rows;
  }

  private async mandarMensagemApresentacao(grupoJID: string): Promise<void> {
    const texto =
      "PRU PRU 🐦‍⬛ (foi mal, ainda tô aprendendo a falar direito)\n\n" +
      "Chegou o BAUÁ na área! A partir de agora sou eu quem fica de olho no pmais por vocês.\n\n" +
      "Bons estudos! 🐦‍⬛";
    await this.#evolutionApiService.sendText(grupoJID, texto);
  }

  /** Similaridade simples baseada em tokens em comum (case/acento-insensível) — só pra ordenar sugestões, não pra decidir sozinha. */
  #similaridade(nomeA: string, nomeB: string): number {
    const normalizar = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();

    const tokensA = new Set(normalizar(nomeA).split(" ").filter(Boolean));
    const tokensB = new Set(normalizar(nomeB).split(" ").filter(Boolean));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;

    let comuns = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) comuns++;
    }
    return comuns / Math.max(tokensA.size, tokensB.size);
  }

  private toDTO(vinculo: TurmaGrupoWhatsapp): TurmaGrupoWhatsappDTO {
    return {
      TurmaGrupoWhatsappGUID: vinculo.TurmaGrupoWhatsappGUID,
      TurmaGUID: vinculo.TurmaGUID,
      GrupoWhatsappJID: vinculo.GrupoWhatsappJID,
      CriadoPorBaua: vinculo.CriadoPorBaua,
      CriadoPorUsuarioGUID: vinculo.CriadoPorUsuarioGUID,
      CreatedAt: vinculo.CreatedAt?.toISOString?.() ?? String(vinculo.CreatedAt),
      UpdatedAt: vinculo.UpdatedAt?.toISOString?.() ?? String(vinculo.UpdatedAt),
    };
  }
}
