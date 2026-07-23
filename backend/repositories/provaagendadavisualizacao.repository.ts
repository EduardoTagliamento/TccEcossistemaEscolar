import MysqlDatabase from "../database/MysqlDatabase";
import ProvaAgendadaVisualizacao from "../entities/provaagendadavisualizacao.model";

interface ProvaAgendadaVisualizacaoRow {
  ProvaAgendadaVisualizacaoGUID: string;
  ProvaAgendadaTurmaGUID: string;
  MatriculaGUID: string;
  VisualizadoEm: Date;
}

export class ProvaAgendadaVisualizacaoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ProvaAgendadaVisualizacaoDAO.constructor()");
    this.#database = databaseInstance;
  }

  findByProvaTurmaEMatricula = async (
    provaAgendadaTurmaGUID: string,
    matriculaGUID: string
  ): Promise<ProvaAgendadaVisualizacao | null> => {
    console.log("🟢 ProvaAgendadaVisualizacaoDAO.findByProvaTurmaEMatricula()");

    const SQL = `SELECT * FROM provaagendadavisualizacao WHERE ProvaAgendadaTurmaGUID = ? AND MatriculaGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [provaAgendadaTurmaGUID, matriculaGUID]);

    const lista = this.mapRows(rows as ProvaAgendadaVisualizacaoRow[]);
    return lista[0] || null;
  };

  registrar = async (visualizacao: ProvaAgendadaVisualizacao): Promise<void> => {
    console.log("🟢 ProvaAgendadaVisualizacaoDAO.registrar()");

    const SQL = `
      INSERT IGNORE INTO provaagendadavisualizacao
        (ProvaAgendadaVisualizacaoGUID, ProvaAgendadaTurmaGUID, MatriculaGUID)
      VALUES (?, ?, ?);
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [
      visualizacao.ProvaAgendadaVisualizacaoGUID,
      visualizacao.ProvaAgendadaTurmaGUID,
      visualizacao.MatriculaGUID,
    ]);
  };

  private mapRows(rows: ProvaAgendadaVisualizacaoRow[]): ProvaAgendadaVisualizacao[] {
    return rows.map((row) => {
      const visualizacao = new ProvaAgendadaVisualizacao();
      visualizacao.ProvaAgendadaVisualizacaoGUID = row.ProvaAgendadaVisualizacaoGUID;
      visualizacao.ProvaAgendadaTurmaGUID = row.ProvaAgendadaTurmaGUID;
      visualizacao.MatriculaGUID = row.MatriculaGUID;
      visualizacao.VisualizadoEm = new Date(row.VisualizadoEm);
      return visualizacao;
    });
  }
}
