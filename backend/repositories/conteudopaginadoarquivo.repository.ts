import MysqlDatabase from "../database/MysqlDatabase";
import ConteudoPaginadoArquivo from "../entities/conteudopaginadoarquivo.model";

interface ConteudoPaginadoArquivoRow {
  ConteudoPaginadoArquivoGUID: string;
  ConteudoGUID: string;
  Ordem: number;
  ArquivoUrl: string;
  ArquivoMimeType: string;
}

export class ConteudoPaginadoArquivoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ConteudoPaginadoArquivoDAO.constructor()");
    this.#database = databaseInstance;
  }

  createBatch = async (arquivos: ConteudoPaginadoArquivo[]): Promise<void> => {
    console.log(`🟢 ConteudoPaginadoArquivoDAO.createBatch() - ${arquivos.length} arquivo(s)`);

    if (arquivos.length === 0) {
      return;
    }

    const valuesPlaceholder = arquivos.map(() => "(?, ?, ?, ?, ?)").join(", ");
    const SQL = `
      INSERT INTO conteudopaginadoarquivo (ConteudoPaginadoArquivoGUID, ConteudoGUID, Ordem, ArquivoUrl, ArquivoMimeType)
      VALUES ${valuesPlaceholder};
    `;

    const params: any[] = [];
    arquivos.forEach((arquivo) => {
      params.push(
        arquivo.ConteudoPaginadoArquivoGUID,
        arquivo.ConteudoGUID,
        arquivo.Ordem,
        arquivo.ArquivoUrl,
        arquivo.ArquivoMimeType
      );
    });

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);
  };

  findByConteudo = async (conteudoGUID: string): Promise<ConteudoPaginadoArquivo[]> => {
    console.log("🟢 ConteudoPaginadoArquivoDAO.findByConteudo()");

    const SQL = `SELECT * FROM conteudopaginadoarquivo WHERE ConteudoGUID = ? ORDER BY Ordem ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [conteudoGUID]);

    return this.mapRows(rows as ConteudoPaginadoArquivoRow[]);
  };

  findById = async (conteudoPaginadoArquivoGUID: string): Promise<ConteudoPaginadoArquivo | null> => {
    console.log("🟢 ConteudoPaginadoArquivoDAO.findById()");

    const SQL = `SELECT * FROM conteudopaginadoarquivo WHERE ConteudoPaginadoArquivoGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [conteudoPaginadoArquivoGUID]);

    const lista = this.mapRows(rows as ConteudoPaginadoArquivoRow[]);
    return lista[0] || null;
  };

  private mapRows(rows: ConteudoPaginadoArquivoRow[]): ConteudoPaginadoArquivo[] {
    return rows.map((row) => {
      const arquivo = new ConteudoPaginadoArquivo();
      arquivo.ConteudoPaginadoArquivoGUID = row.ConteudoPaginadoArquivoGUID;
      arquivo.ConteudoGUID = row.ConteudoGUID;
      arquivo.Ordem = row.Ordem;
      arquivo.ArquivoUrl = row.ArquivoUrl;
      arquivo.ArquivoMimeType = row.ArquivoMimeType;
      return arquivo;
    });
  }
}
