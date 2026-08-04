import MysqlDatabase from "../database/MysqlDatabase";
import QuestaoBancoAlternativa from "../entities/questaobancoalternativa.model";

interface QuestaoBancoAlternativaRow {
  AlternativaGUID: string;
  QuestaoBancoGUID: string;
  AlternativaTexto: string;
  AlternativaCorreta: number;
  AlternativaOrdem: number;
}

export class QuestaoBancoAlternativaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  QuestaoBancoAlternativaDAO.constructor()");
    this.#database = databaseInstance;
  }

  createBatch = async (alternativas: QuestaoBancoAlternativa[]): Promise<void> => {
    console.log("🟢 QuestaoBancoAlternativaDAO.createBatch()");
    if (alternativas.length === 0) return;

    const placeholders = alternativas.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const params = alternativas.flatMap((a) => [
      a.AlternativaGUID,
      a.QuestaoBancoGUID,
      a.AlternativaTexto,
      a.AlternativaCorreta,
      a.AlternativaOrdem,
    ]);

    const SQL = `
      INSERT INTO questaobancoalternativa (AlternativaGUID, QuestaoBancoGUID, AlternativaTexto, AlternativaCorreta, AlternativaOrdem)
      VALUES ${placeholders}
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);
  };

  findByQuestao = async (questaoBancoGUID: string): Promise<QuestaoBancoAlternativa[]> => {
    console.log("🟢 QuestaoBancoAlternativaDAO.findByQuestao()");

    const SQL = `SELECT * FROM questaobancoalternativa WHERE QuestaoBancoGUID = ? ORDER BY AlternativaOrdem ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [questaoBancoGUID]);
    return this.mapRows(rows as QuestaoBancoAlternativaRow[]);
  };

  deleteByQuestao = async (questaoBancoGUID: string): Promise<void> => {
    console.log("🟢 QuestaoBancoAlternativaDAO.deleteByQuestao()");

    const SQL = `DELETE FROM questaobancoalternativa WHERE QuestaoBancoGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [questaoBancoGUID]);
  };

  private mapRows(rows: QuestaoBancoAlternativaRow[]): QuestaoBancoAlternativa[] {
    return rows.map((row) => {
      const alternativa = new QuestaoBancoAlternativa();
      alternativa.AlternativaGUID = row.AlternativaGUID;
      alternativa.QuestaoBancoGUID = row.QuestaoBancoGUID;
      alternativa.AlternativaTexto = row.AlternativaTexto;
      alternativa.AlternativaCorreta = Boolean(row.AlternativaCorreta);
      alternativa.AlternativaOrdem = row.AlternativaOrdem;
      return alternativa;
    });
  }
}
