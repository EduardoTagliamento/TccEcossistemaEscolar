import { RowDataPacket } from "mysql2";
import MysqlDatabase from "../database/MysqlDatabase";
import { gerarGUID } from "../utils/helpers/guid.helper";
import { QuestaoBancoDificuldade } from "../entities/questaobanco.model";

export interface QuestaoBancoProgressoFiltros {
  VestibularGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
}

/** Linha de `listarComQuestao` — progresso + os campos da questão pra preview (spec: não a
 * questão inteira, só enunciado/dificuldade/vestibular/data). */
export interface QuestaoComProgressoRow extends RowDataPacket {
  QuestaoBancoGUID: string;
  Enunciado: string;
  Dificuldade: QuestaoBancoDificuldade;
  VestibularGUID: string;
  Acertou: number | null;
  FeitaEm: Date | null;
  MarcadaEm: Date | null;
}

export class QuestaoBancoProgressoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  QuestaoBancoProgressoDAO.constructor()");
    this.#database = databaseInstance;
  }

  /** Registra resposta — upsert; se já existia (ex.: aluno refez uma questão "revisitada"),
   * sobrescreve Acertou/FeitaEm com a tentativa mais recente. */
  registrarResposta = async (usuarioGUID: string, questaoBancoGUID: string, acertou: boolean): Promise<void> => {
    console.log("🟢 QuestaoBancoProgressoDAO.registrarResposta()");

    const SQL = `
      INSERT INTO questaobancoprogresso (QuestaoBancoProgressoGUID, UsuarioGUID, QuestaoBancoGUID, Feita, Acertou, FeitaEm)
      VALUES (?, ?, ?, 1, ?, NOW())
      ON DUPLICATE KEY UPDATE Feita = 1, Acertou = VALUES(Acertou), FeitaEm = NOW()
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [gerarGUID(), usuarioGUID, questaoBancoGUID, acertou ? 1 : 0]);
  };

  /** "Revisitar" — desmarca Feita, a questão volta a entrar na randomização. Não toca em Marcada. */
  desmarcarFeita = async (usuarioGUID: string, questaoBancoGUID: string): Promise<void> => {
    console.log("🟢 QuestaoBancoProgressoDAO.desmarcarFeita()");

    const SQL = `
      UPDATE questaobancoprogresso SET Feita = 0, Acertou = NULL, FeitaEm = NULL
      WHERE UsuarioGUID = ? AND QuestaoBancoGUID = ?
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [usuarioGUID, questaoBancoGUID]);
  };

  /** Alterna Marcada — upsert, independente de Feita. */
  definirMarcada = async (usuarioGUID: string, questaoBancoGUID: string, marcada: boolean): Promise<void> => {
    console.log("🟢 QuestaoBancoProgressoDAO.definirMarcada()");

    const SQL = `
      INSERT INTO questaobancoprogresso (QuestaoBancoProgressoGUID, UsuarioGUID, QuestaoBancoGUID, Marcada, MarcadaEm)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE Marcada = VALUES(Marcada), MarcadaEm = VALUES(MarcadaEm)
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [gerarGUID(), usuarioGUID, questaoBancoGUID, marcada ? 1 : 0, marcada ? new Date() : null]);
  };

  /** GUIDs feitas por esse aluno — usado pra excluir do pool de randomização da prática. */
  buscarGUIDsFeitas = async (usuarioGUID: string): Promise<string[]> => {
    console.log("🟢 QuestaoBancoProgressoDAO.buscarGUIDsFeitas()");

    const SQL = `SELECT QuestaoBancoGUID FROM questaobancoprogresso WHERE UsuarioGUID = ? AND Feita = 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [usuarioGUID]);
    return rows.map((r) => r.QuestaoBancoGUID as string);
  };

  /** Lista "Feitas" ou "Marcadas" já com os campos de preview da questão (join), filtrável por
   * vestibular/dificuldade — alimenta a tela de histórico. Só questões Status='Validado'
   * (uma questão despublicada depois não deveria continuar aparecendo no histórico). */
  listarComQuestao = async (
    usuarioGUID: string,
    status: "Feitas" | "Marcadas",
    filtros: QuestaoBancoProgressoFiltros
  ): Promise<QuestaoComProgressoRow[]> => {
    console.log("🟢 QuestaoBancoProgressoDAO.listarComQuestao()");

    const campoFlag = status === "Feitas" ? "Feita" : "Marcada";
    const campoData = status === "Feitas" ? "FeitaEm" : "MarcadaEm";
    const conditions = [`qbp.UsuarioGUID = ?`, `qbp.${campoFlag} = 1`, `qb.Status = 'Validado'`];
    const params: any[] = [usuarioGUID];

    if (filtros.VestibularGUID) {
      conditions.push("qb.VestibularGUID = ?");
      params.push(filtros.VestibularGUID);
    }
    if (filtros.Dificuldade) {
      conditions.push("qb.Dificuldade = ?");
      params.push(filtros.Dificuldade);
    }

    const SQL = `
      SELECT qb.QuestaoBancoGUID, qb.Enunciado, qb.Dificuldade, qb.VestibularGUID, qbp.Acertou, qbp.FeitaEm, qbp.MarcadaEm
      FROM questaobancoprogresso qbp
      INNER JOIN questaobanco qb ON qb.QuestaoBancoGUID = qbp.QuestaoBancoGUID
      WHERE ${conditions.join(" AND ")}
      ORDER BY qbp.${campoData} DESC
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<QuestaoComProgressoRow[]>(SQL, params);
    return rows;
  };
}
