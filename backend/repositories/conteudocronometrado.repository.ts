import MysqlDatabase from "../database/MysqlDatabase";
import ConteudoCronometrado from "../entities/conteudocronometrado.model";

interface ConteudoCronometradoRow {
  ConteudoGUID: string;
  OrigemTipo: "upload" | "link";
  ArquivoUrl: string | null;
  LinkUrl: string | null;
  DuracaoSegundos: number | null;
  ArquivoMimeType: string | null;
}

export class ConteudoCronometradoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ConteudoCronometradoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (dados: ConteudoCronometrado): Promise<void> => {
    console.log("🟢 ConteudoCronometradoDAO.create()");

    const SQL = `
      INSERT INTO conteudocronometrado (ConteudoGUID, OrigemTipo, ArquivoUrl, LinkUrl, DuracaoSegundos, ArquivoMimeType)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      dados.ConteudoGUID,
      dados.OrigemTipo,
      dados.ArquivoUrl,
      dados.LinkUrl,
      dados.DuracaoSegundos,
      dados.ArquivoMimeType,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);
  };

  findByConteudo = async (conteudoGUID: string): Promise<ConteudoCronometrado | null> => {
    console.log("🟢 ConteudoCronometradoDAO.findByConteudo()");

    const SQL = `SELECT * FROM conteudocronometrado WHERE ConteudoGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [conteudoGUID]);

    const registros = this.mapRows(rows as ConteudoCronometradoRow[]);
    return registros[0] || null;
  };

  private mapRows(rows: ConteudoCronometradoRow[]): ConteudoCronometrado[] {
    return rows.map((row) => {
      const dados = new ConteudoCronometrado();
      dados.ConteudoGUID = row.ConteudoGUID;
      dados.OrigemTipo = row.OrigemTipo;
      dados.ArquivoUrl = row.ArquivoUrl;
      dados.LinkUrl = row.LinkUrl;
      dados.DuracaoSegundos = row.DuracaoSegundos;
      dados.ArquivoMimeType = row.ArquivoMimeType;
      return dados;
    });
  }
}
