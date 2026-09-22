import { RowDataPacket } from "mysql2";
import MysqlDatabase from "../database/MysqlDatabase";
import ProvaAgendadaTurmaResumoEnvio from "../entities/provaagendadaturmaresumoenvio.model";

interface ProvaAgendadaTurmaResumoEnvioRow extends RowDataPacket {
  ProvaAgendadaTurmaResumoEnvioGUID: string;
  ProvaAgendadaGUID: string;
  TurmaGUID: string;
  Destino: "GrupoReal" | "TelefoneTeste";
  EnviadoEm: Date;
}

export class ProvaAgendadaTurmaResumoEnvioDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ProvaAgendadaTurmaResumoEnvioDAO.constructor()");
    this.#database = databaseInstance;
  }

  /** Idempotente: se já existir (UNIQUE em ProvaAgendadaGUID+TurmaGUID), não faz nada e retorna false. */
  registrar = async (envio: ProvaAgendadaTurmaResumoEnvio): Promise<boolean> => {
    console.log("🟢 ProvaAgendadaTurmaResumoEnvioDAO.registrar()");

    const SQL = `
      INSERT IGNORE INTO provaagendada_turma_resumo_envio
        (ProvaAgendadaTurmaResumoEnvioGUID, ProvaAgendadaGUID, TurmaGUID, Destino)
      VALUES (?, ?, ?, ?);
    `;
    const params = [
      envio.ProvaAgendadaTurmaResumoEnvioGUID,
      envio.ProvaAgendadaGUID,
      envio.TurmaGUID,
      envio.Destino,
    ];

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<any>(SQL, params);
    return result.affectedRows > 0;
  };

  jaEnviado = async (provaAgendadaGUID: string, turmaGUID: string): Promise<boolean> => {
    console.log("🟢 ProvaAgendadaTurmaResumoEnvioDAO.jaEnviado()");

    const SQL = `
      SELECT 1 FROM provaagendada_turma_resumo_envio
      WHERE ProvaAgendadaGUID = ? AND TurmaGUID = ?
      LIMIT 1
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProvaAgendadaTurmaResumoEnvioRow[]>(SQL, [provaAgendadaGUID, turmaGUID]);
    return rows.length > 0;
  };
}
