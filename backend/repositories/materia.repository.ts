import MysqlDatabase from "../database/MysqlDatabase";
import Materia from "../entities/materia.model";

interface MateriaRow {
  MateriaGUID: string;
  EscolaGUID: string;
  CursoGUID: string | null;
  MateriaNome: string;
  MateriaIsTecnica: boolean;
  MateriaStatus: "Ativa" | "Inativa";
  MateriaCreatedAt: Date;
  MateriaUpdatedAt: Date;
}

export interface MateriaFilters {
  EscolaGUID?: string;
  MateriaStatus?: "Ativa" | "Inativa";
  MateriaIsTecnica?: boolean;
}

export class MateriaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  MateriaDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (materia: Materia): Promise<string> => {
    console.log("🟢 MateriaDAO.create()");

    const SQL = `
      INSERT INTO materia
      (MateriaGUID, EscolaGUID, MateriaNome, MateriaIsTecnica, MateriaStatus)
      VALUES (?, ?, ?, ?, ?);
    `;
    const params = [
      materia.MateriaGUID,
      materia.EscolaGUID,
      materia.MateriaNome,
      materia.MateriaIsTecnica,
      materia.MateriaStatus,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return materia.MateriaGUID;
  };

  findAll = async (filters: MateriaFilters = {}): Promise<Materia[]> => {
    console.log("🟢 MateriaDAO.findAll()");

    const pool = await this.#database.getPool();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.EscolaGUID) {
      conditions.push("EscolaGUID = ?");
      params.push(filters.EscolaGUID);
    }

    if (filters.MateriaStatus) {
      conditions.push("MateriaStatus = ?");
      params.push(filters.MateriaStatus);
    }

    if (filters.MateriaIsTecnica !== undefined) {
      conditions.push("MateriaIsTecnica = ?");
      params.push(filters.MateriaIsTecnica);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const SQL = `SELECT * FROM materia ${whereClause} ORDER BY MateriaNome ASC`;

    const [rows] = await pool.execute(SQL, params);
    return this.mapRows(rows as MateriaRow[]);
  };

  findById = async (MateriaGUID: string): Promise<Materia | null> => {
    console.log("🟢 MateriaDAO.findById()");

    const SQL = `SELECT * FROM materia WHERE MateriaGUID = ?`;
    const params = [MateriaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, params);

    const materias = this.mapRows(rows as MateriaRow[]);
    return materias[0] || null;
  };

  findByEscolaAndNome = async (
    escolaGUID: string,
    nome: string
  ): Promise<Materia | null> => {
    console.log("🟢 MateriaDAO.findByEscolaAndNome()");

    const SQL = `
      SELECT * FROM materia 
      WHERE EscolaGUID = ? AND MateriaNome = ?
      LIMIT 1
    `;
    const params = [escolaGUID, nome];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, params);

    const materias = this.mapRows(rows as MateriaRow[]);
    return materias[0] || null;
  };

  update = async (materiaGUID: string, materia: Partial<Materia>): Promise<Materia | null> => {
    console.log("🟢 MateriaDAO.update()");

    const SQL = `
      UPDATE materia
      SET MateriaNome = ?, 
          MateriaIsTecnica = ?, 
          MateriaStatus = ?,
          CursoGUID = ?,
          MateriaUpdatedAt = CURRENT_TIMESTAMP
      WHERE MateriaGUID = ?
    `;
    const params = [
      materia.MateriaNome,
      materia.MateriaIsTecnica,
      materia.MateriaStatus,
      materia.CursoGUID,
      materiaGUID,
    ];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    if ((resultado as { affectedRows: number }).affectedRows > 0) {
      return await this.findById(materiaGUID);
    }

    return null;
  };

  delete = async (MateriaGUID: string): Promise<boolean> => {
    console.log("🟢 MateriaDAO.delete() - Soft delete");

    // Soft delete: apenas inativa a matéria
    const SQL = `
      UPDATE materia 
      SET MateriaStatus = 'Inativa',
          MateriaUpdatedAt = CURRENT_TIMESTAMP
      WHERE MateriaGUID = ?
    `;
    const params = [MateriaGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  countByEscola = async (escolaGUID: string): Promise<number> => {
    console.log("🟢 MateriaDAO.countByEscola()");

    const SQL = `SELECT COUNT(*) as total FROM materia WHERE EscolaGUID = ?`;
    const params = [escolaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, params);

    return (rows as any[])[0]?.total || 0;
  };

  private mapRows(rows: MateriaRow[]): Materia[] {
    return rows.map((row) => {
      const materia = new Materia();
      materia.MateriaGUID = row.MateriaGUID;
      materia.EscolaGUID = row.EscolaGUID;
      materia.CursoGUID = row.CursoGUID;
      materia.MateriaNome = row.MateriaNome;
      materia.MateriaIsTecnica = Boolean(row.MateriaIsTecnica);
      materia.MateriaStatus = row.MateriaStatus;
      materia.MateriaCreatedAt = new Date(row.MateriaCreatedAt);
      materia.MateriaUpdatedAt = new Date(row.MateriaUpdatedAt);
      return materia;
    });
  }
}
