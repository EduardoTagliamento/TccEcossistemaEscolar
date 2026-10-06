import MysqlDatabase from "../database/MysqlDatabase";
import { QuestaoBancoProgressoDAO, QuestaoBancoProgressoFiltros, QuestaoComProgressoRow } from "../repositories/questaobancoprogresso.repository";
import { QuestaoBancoDificuldade } from "../entities/questaobanco.model";
import ErrorResponse from "../utils/ErrorResponse";

export interface QuestaoHistoricoDTO {
  QuestaoBancoGUID: string;
  EnunciadoPreview: string;
  Dificuldade: QuestaoBancoDificuldade;
  VestibularGUID: string;
  Acertou: boolean | null;
  FeitaEm: string | null;
  MarcadaEm: string | null;
}

const TAMANHO_PREVIEW = 160;

/**
 * Tracking de progresso por aluno no Banco de Questões (pedido do Eduardo,
 * 06/10/2026): questão "Feita" sai do pool de randomização da prática;
 * "Marcada" é favoritar, independente de ter feito. Uma linha por
 * (aluno, questão) em `questaobancoprogresso`.
 */
export default class QuestaoBancoProgressoService {
  #progressoDAO: QuestaoBancoProgressoDAO;

  constructor(progressoDAODependency: QuestaoBancoProgressoDAO) {
    console.log("⬆️  QuestaoBancoProgressoService.constructor()");
    this.#progressoDAO = progressoDAODependency;
  }

  registrarResposta = async (usuarioGUID: string, questaoBancoGUID: string, acertou: boolean): Promise<void> => {
    console.log("🟣 QuestaoBancoProgressoService.registrarResposta()");
    if (!usuarioGUID) throw new ErrorResponse(401, "Não autenticado");
    await this.#progressoDAO.registrarResposta(usuarioGUID, questaoBancoGUID, acertou);
  };

  /** "Revisitar" — a questão volta a entrar no pool de randomização. */
  desmarcarFeita = async (usuarioGUID: string, questaoBancoGUID: string): Promise<void> => {
    console.log("🟣 QuestaoBancoProgressoService.desmarcarFeita()");
    if (!usuarioGUID) throw new ErrorResponse(401, "Não autenticado");
    await this.#progressoDAO.desmarcarFeita(usuarioGUID, questaoBancoGUID);
  };

  definirMarcada = async (usuarioGUID: string, questaoBancoGUID: string, marcada: boolean): Promise<void> => {
    console.log("🟣 QuestaoBancoProgressoService.definirMarcada()");
    if (!usuarioGUID) throw new ErrorResponse(401, "Não autenticado");
    await this.#progressoDAO.definirMarcada(usuarioGUID, questaoBancoGUID, marcada);
  };

  listarHistorico = async (
    usuarioGUID: string,
    status: "Feitas" | "Marcadas",
    filtros: QuestaoBancoProgressoFiltros
  ): Promise<QuestaoHistoricoDTO[]> => {
    console.log("🟣 QuestaoBancoProgressoService.listarHistorico()");
    if (!usuarioGUID) throw new ErrorResponse(401, "Não autenticado");

    const linhas = await this.#progressoDAO.listarComQuestao(usuarioGUID, status, filtros);
    return linhas.map((linha) => this.#toDTO(linha));
  };

  #toDTO = (linha: QuestaoComProgressoRow): QuestaoHistoricoDTO => ({
    QuestaoBancoGUID: linha.QuestaoBancoGUID,
    EnunciadoPreview:
      linha.Enunciado.length > TAMANHO_PREVIEW ? `${linha.Enunciado.slice(0, TAMANHO_PREVIEW)}…` : linha.Enunciado,
    Dificuldade: linha.Dificuldade,
    VestibularGUID: linha.VestibularGUID,
    Acertou: linha.Acertou === null ? null : !!linha.Acertou,
    FeitaEm: linha.FeitaEm ? new Date(linha.FeitaEm).toISOString() : null,
    MarcadaEm: linha.MarcadaEm ? new Date(linha.MarcadaEm).toISOString() : null,
  });
}

let instanciaSingleton: QuestaoBancoProgressoService | null = null;

export function getQuestaoBancoProgressoService(): QuestaoBancoProgressoService {
  if (!instanciaSingleton) {
    const database = new MysqlDatabase();
    instanciaSingleton = new QuestaoBancoProgressoService(new QuestaoBancoProgressoDAO(database));
  }
  return instanciaSingleton;
}
