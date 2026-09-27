import ProfessorMateria from "../entities/professormateria.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export interface ProfessorMateriaComNomeDTO {
  ProfessorMateriaGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  ProfessorMateriaStatus: 'Ativa' | 'Inativa';
}

interface ProfessorMateriaRow extends RowDataPacket {
  ProfessorMateriaGUID: string;
  EscolaGUID: string;
  UsuarioGUID: string;
  MateriaGUID: string;
  ProfessorMateriaStatus: 'Ativa' | 'Inativa';
  CreatedAt: Date;
  UpdatedAt: Date;
}

/**
 * Repository (DAO) para qualificação de professor por matéria
 * (`professormateria` — ver backend/entities/professormateria.model.ts pro
 * porquê disso existir separado de `materiaxprofessorxturma`).
 */
export class ProfessorMateriaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    this.#database = database;
  }

  async create(pm: ProfessorMateria): Promise<ProfessorMateria> {
    const query = `
      INSERT INTO professormateria (
        ProfessorMateriaGUID, EscolaGUID, UsuarioGUID, MateriaGUID, ProfessorMateriaStatus, CreatedAt, UpdatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      pm.ProfessorMateriaGUID,
      pm.EscolaGUID,
      pm.UsuarioGUID,
      pm.MateriaGUID,
      pm.ProfessorMateriaStatus,
      pm.CreatedAt,
      pm.UpdatedAt,
    ];
    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return pm;
  }

  async findByUsuarioEMateria(usuarioGUID: string, materiaGUID: string): Promise<ProfessorMateria | null> {
    const query = `SELECT * FROM professormateria WHERE UsuarioGUID = ? AND MateriaGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProfessorMateriaRow[]>(query, [usuarioGUID, materiaGUID]);
    if (!rows || rows.length === 0) return null;
    return this.mapRows(rows)[0];
  }

  /** Qualificações ATIVAS de um professor numa escola, já com o nome da matéria. */
  async findAtivasComNomePorProfessor(usuarioGUID: string, escolaGUID: string): Promise<ProfessorMateriaComNomeDTO[]> {
    const query = `
      SELECT pm.ProfessorMateriaGUID, pm.MateriaGUID, m.MateriaNome, pm.ProfessorMateriaStatus
      FROM professormateria pm
      INNER JOIN materia m ON m.MateriaGUID = pm.MateriaGUID
      WHERE pm.UsuarioGUID = ? AND pm.EscolaGUID = ? AND pm.ProfessorMateriaStatus = 'Ativa'
      ORDER BY m.MateriaNome ASC
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [usuarioGUID, escolaGUID]);
    return rows.map((row) => ({
      ProfessorMateriaGUID: row.ProfessorMateriaGUID,
      MateriaGUID: row.MateriaGUID,
      MateriaNome: row.MateriaNome,
      ProfessorMateriaStatus: row.ProfessorMateriaStatus,
    }));
  }

  async update(guid: string, status: 'Ativa' | 'Inativa'): Promise<void> {
    const query = `UPDATE professormateria SET ProfessorMateriaStatus = ?, UpdatedAt = ? WHERE ProfessorMateriaGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute(query, [status, new Date(), guid]);
  }

  private mapRows(rows: ProfessorMateriaRow[]): ProfessorMateria[] {
    return rows.map((row) => ProfessorMateria.fromDatabase(row));
  }
}
