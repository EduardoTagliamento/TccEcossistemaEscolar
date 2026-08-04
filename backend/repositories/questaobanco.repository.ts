import MysqlDatabase from "../database/MysqlDatabase";
import QuestaoBanco, { QuestaoBancoDificuldade } from "../entities/questaobanco.model";

interface QuestaoBancoRow {
  QuestaoBancoGUID: string;
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Dificuldade: QuestaoBancoDificuldade;
  Enunciado: string;
  VideoResolucaoUrl: string | null;
  CriadoPorCPF: string;
  CreatedAt: Date;
}

export interface QuestaoBancoFiltros {
  SubMateriaGlobalGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
  VestibularGUID?: string;
}

export class QuestaoBancoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  QuestaoBancoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (questao: QuestaoBanco): Promise<void> => {
    console.log("🟢 QuestaoBancoDAO.create()");

    const SQL = `
      INSERT INTO questaobanco (QuestaoBancoGUID, MateriaGlobalGUID, SubMateriaGlobalGUID, VestibularGUID, Dificuldade, Enunciado, VideoResolucaoUrl, CriadoPorCPF)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [
      questao.QuestaoBancoGUID,
      questao.MateriaGlobalGUID,
      questao.SubMateriaGlobalGUID,
      questao.VestibularGUID,
      questao.Dificuldade,
      questao.Enunciado,
      questao.VideoResolucaoUrl,
      questao.CriadoPorCPF,
    ]);
  };

  findById = async (guid: string): Promise<QuestaoBanco | null> => {
    console.log("🟢 QuestaoBancoDAO.findById()");

    const SQL = `SELECT * FROM questaobanco WHERE QuestaoBancoGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as QuestaoBancoRow[]);
    return lista[0] || null;
  };

  /** Busca filtrada direta (spec item 12) — sem chamada de LLM. */
  findAll = async (filtros: QuestaoBancoFiltros): Promise<QuestaoBanco[]> => {
    console.log("🟢 QuestaoBancoDAO.findAll()");

    const pool = await this.#database.getPool();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros.SubMateriaGlobalGUID) {
      conditions.push("SubMateriaGlobalGUID = ?");
      params.push(filtros.SubMateriaGlobalGUID);
    }
    if (filtros.Dificuldade) {
      conditions.push("Dificuldade = ?");
      params.push(filtros.Dificuldade);
    }
    if (filtros.VestibularGUID) {
      conditions.push("VestibularGUID = ?");
      params.push(filtros.VestibularGUID);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const SQL = `SELECT * FROM questaobanco ${whereClause} ORDER BY CreatedAt DESC`;
    const [rows] = await pool.execute(SQL, params);
    return this.mapRows(rows as QuestaoBancoRow[]);
  };

  /** Só existência (spec: passo "banco de questões" do pipeline só precisa saber se há alguma). */
  existeParaSubMateria = async (subMateriaGlobalGUID: string): Promise<boolean> => {
    console.log("🟢 QuestaoBancoDAO.existeParaSubMateria()");

    const SQL = `SELECT 1 FROM questaobanco WHERE SubMateriaGlobalGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [subMateriaGlobalGUID]);
    return (rows as unknown[]).length > 0;
  };

  delete = async (guid: string): Promise<boolean> => {
    console.log("🟢 QuestaoBancoDAO.delete()");

    const SQL = `DELETE FROM questaobanco WHERE QuestaoBancoGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [guid]);
    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRows(rows: QuestaoBancoRow[]): QuestaoBanco[] {
    return rows.map((row) => {
      const questao = new QuestaoBanco();
      questao.QuestaoBancoGUID = row.QuestaoBancoGUID;
      questao.MateriaGlobalGUID = row.MateriaGlobalGUID;
      questao.SubMateriaGlobalGUID = row.SubMateriaGlobalGUID;
      questao.VestibularGUID = row.VestibularGUID;
      questao.Dificuldade = row.Dificuldade;
      questao.Enunciado = row.Enunciado;
      questao.VideoResolucaoUrl = row.VideoResolucaoUrl;
      questao.CriadoPorCPF = row.CriadoPorCPF;
      questao.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
      return questao;
    });
  }
}
