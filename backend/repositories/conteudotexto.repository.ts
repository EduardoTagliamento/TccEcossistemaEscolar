import MysqlDatabase from "../database/MysqlDatabase";
import ConteudoTexto from "../entities/conteudotexto.model";

interface ConteudoTextoRow {
  ConteudoGUID: string;
  ConteudoHtml: string;
}

export class ConteudoTextoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ConteudoTextoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (dados: ConteudoTexto): Promise<void> => {
    console.log("🟢 ConteudoTextoDAO.create()");

    const SQL = `INSERT INTO conteudotexto (ConteudoGUID, ConteudoHtml) VALUES (?, ?);`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [dados.ConteudoGUID, dados.ConteudoHtml]);
  };

  findByConteudo = async (conteudoGUID: string): Promise<ConteudoTexto | null> => {
    console.log("🟢 ConteudoTextoDAO.findByConteudo()");

    const SQL = `SELECT * FROM conteudotexto WHERE ConteudoGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [conteudoGUID]);

    const registros = this.mapRows(rows as ConteudoTextoRow[]);
    return registros[0] || null;
  };

  private mapRows(rows: ConteudoTextoRow[]): ConteudoTexto[] {
    return rows.map((row) => {
      const dados = new ConteudoTexto();
      dados.ConteudoGUID = row.ConteudoGUID;
      dados.ConteudoHtml = row.ConteudoHtml;
      return dados;
    });
  }
}
