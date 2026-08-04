import MysqlDatabase from "../database/MysqlDatabase";

interface ProvaAgendadaAssuntoRow {
  ProvaAgendadaGUID: string;
  AssuntoGUID: string;
}

/**
 * Travamento manual de assunto na prova (spec item 3) — join simples,
 * sem entidade própria (mesmo padrão de tabela de junção pura já usado
 * no projeto, ex. vínculos N:N sem atributo próprio).
 */
export class ProvaAgendadaAssuntoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ProvaAgendadaAssuntoDAO.constructor()");
    this.#database = databaseInstance;
  }

  substituir = async (provaAgendadaGUID: string, assuntoGUIDs: string[]): Promise<void> => {
    console.log("🟢 ProvaAgendadaAssuntoDAO.substituir()");

    const pool = await this.#database.getPool();
    await pool.execute(`DELETE FROM provaagendadaassunto WHERE ProvaAgendadaGUID = ?`, [provaAgendadaGUID]);

    if (assuntoGUIDs.length === 0) return;

    const placeholders = assuntoGUIDs.map(() => "(?, ?)").join(", ");
    const params = assuntoGUIDs.flatMap((assuntoGUID) => [provaAgendadaGUID, assuntoGUID]);
    await pool.execute(
      `INSERT INTO provaagendadaassunto (ProvaAgendadaGUID, AssuntoGUID) VALUES ${placeholders}`,
      params
    );
  };

  findByProva = async (provaAgendadaGUID: string): Promise<string[]> => {
    console.log("🟢 ProvaAgendadaAssuntoDAO.findByProva()");

    const SQL = `SELECT AssuntoGUID FROM provaagendadaassunto WHERE ProvaAgendadaGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [provaAgendadaGUID]);
    return (rows as ProvaAgendadaAssuntoRow[]).map((row) => row.AssuntoGUID);
  };
}
