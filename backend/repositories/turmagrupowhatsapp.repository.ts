import { RowDataPacket } from "mysql2";
import MysqlDatabase from "../database/MysqlDatabase";
import TurmaGrupoWhatsapp from "../entities/turmagrupowhatsapp.model";

interface TurmaGrupoWhatsappRow extends RowDataPacket {
  TurmaGrupoWhatsappGUID: string;
  TurmaGUID: string;
  GrupoWhatsappJID: string;
  CriadoPorBaua: number;
  CriadoPorUsuarioGUID: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class TurmaGrupoWhatsappDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  TurmaGrupoWhatsappDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (vinculo: TurmaGrupoWhatsapp): Promise<void> => {
    console.log("🟢 TurmaGrupoWhatsappDAO.create()");

    const SQL = `
      INSERT INTO turma_grupo_whatsapp
        (TurmaGrupoWhatsappGUID, TurmaGUID, GrupoWhatsappJID, CriadoPorBaua, CriadoPorUsuarioGUID)
      VALUES (?, ?, ?, ?, ?);
    `;
    const params = [
      vinculo.TurmaGrupoWhatsappGUID,
      vinculo.TurmaGUID,
      vinculo.GrupoWhatsappJID,
      vinculo.CriadoPorBaua ? 1 : 0,
      vinculo.CriadoPorUsuarioGUID,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);
  };

  findByTurma = async (turmaGUID: string): Promise<TurmaGrupoWhatsapp | null> => {
    console.log("🟢 TurmaGrupoWhatsappDAO.findByTurma()");

    const SQL = `SELECT * FROM turma_grupo_whatsapp WHERE TurmaGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TurmaGrupoWhatsappRow[]>(SQL, [turmaGUID]);

    return rows[0] ? this.mapRow(rows[0]) : null;
  };

  findByJid = async (grupoWhatsappJID: string): Promise<TurmaGrupoWhatsapp | null> => {
    console.log("🟢 TurmaGrupoWhatsappDAO.findByJid()");

    const SQL = `SELECT * FROM turma_grupo_whatsapp WHERE GrupoWhatsappJID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TurmaGrupoWhatsappRow[]>(SQL, [grupoWhatsappJID]);

    return rows[0] ? this.mapRow(rows[0]) : null;
  };

  /** Remove o vínculo pelo TurmaGUID — pré-requisito pra linkar outro grupo à mesma turma. */
  deleteByTurma = async (turmaGUID: string): Promise<boolean> => {
    console.log("🟢 TurmaGrupoWhatsappDAO.deleteByTurma()");

    const SQL = `DELETE FROM turma_grupo_whatsapp WHERE TurmaGUID = ?`;
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<any>(SQL, [turmaGUID]);
    return result.affectedRows > 0;
  };

  private mapRow(row: TurmaGrupoWhatsappRow): TurmaGrupoWhatsapp {
    return TurmaGrupoWhatsapp.fromDatabase(row);
  }
}
