import MysqlDatabase from "../database/MysqlDatabase";
import QuestaoBanco, { QuestaoBancoDificuldade, QuestaoBancoStatus } from "../entities/questaobanco.model";

interface QuestaoBancoRow {
  QuestaoBancoGUID: string;
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Dificuldade: QuestaoBancoDificuldade;
  Status: QuestaoBancoStatus;
  Enunciado: string;
  VideoResolucaoUrl: string | null;
  CriadoPorGUID: string;
  CreatedAt: Date;
}

export interface QuestaoBancoFiltros {
  MateriaGlobalGUID?: string;
  SubMateriaGlobalGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
  VestibularGUID?: string;
  Status?: QuestaoBancoStatus;
}

/** Campos editáveis via tela de validação — todos opcionais (atualiza só o que vier). */
export interface QuestaoBancoUpdateCampos {
  MateriaGlobalGUID?: string;
  SubMateriaGlobalGUID?: string;
  VestibularGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
  Status?: QuestaoBancoStatus;
  Enunciado?: string;
  VideoResolucaoUrl?: string | null;
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
      INSERT INTO questaobanco (QuestaoBancoGUID, MateriaGlobalGUID, SubMateriaGlobalGUID, VestibularGUID, Dificuldade, Enunciado, VideoResolucaoUrl, CriadoPorGUID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // Status não entra no INSERT — a coluna já nasce 'Pendente' via DEFAULT do schema, mesmo
    // valor que `new QuestaoBanco()` usa antes de qualquer set explícito (entity e banco
    // concordam sem precisar repetir o literal aqui).
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [
      questao.QuestaoBancoGUID,
      questao.MateriaGlobalGUID,
      questao.SubMateriaGlobalGUID,
      questao.VestibularGUID,
      questao.Dificuldade,
      questao.Enunciado,
      questao.VideoResolucaoUrl,
      questao.CriadoPorGUID,
    ]);
  };

  /** Atualiza só os campos informados — usado pela tela de validação (editar enunciado,
   * dificuldade, matéria/submatéria/vestibular) e por `validarQuestao` (Status). */
  update = async (guid: string, campos: QuestaoBancoUpdateCampos): Promise<void> => {
    console.log("🟢 QuestaoBancoDAO.update()");
    const entradas = Object.entries(campos).filter(([, v]) => v !== undefined);
    if (entradas.length === 0) return;

    const SQL = `UPDATE questaobanco SET ${entradas.map(([campo]) => `${campo} = ?`).join(", ")} WHERE QuestaoBancoGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [...entradas.map(([, v]) => v), guid]);
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

    if (filtros.MateriaGlobalGUID) {
      conditions.push("MateriaGlobalGUID = ?");
      params.push(filtros.MateriaGlobalGUID);
    }
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
    if (filtros.Status) {
      conditions.push("Status = ?");
      params.push(filtros.Status);
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
      questao.Status = row.Status;
      questao.Enunciado = row.Enunciado;
      questao.VideoResolucaoUrl = row.VideoResolucaoUrl;
      questao.CriadoPorGUID = row.CriadoPorGUID;
      questao.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
      return questao;
    });
  }
}
