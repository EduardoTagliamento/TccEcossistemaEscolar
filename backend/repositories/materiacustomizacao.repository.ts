import MysqlDatabase from "../database/MysqlDatabase";
import MateriaCustomizacao from "../entities/materiacustomizacao.model";

interface MateriaCustomizacaoRow {
  MateriaCustomizacaoGUID: string;
  MateriaGUID: string;
  UsuarioGUID: string;
  ImagemUrl: string | null;
  CorFundo: string | null;
  MensagemBoasVindas: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class MateriaCustomizacaoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  MateriaCustomizacaoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (customizacao: MateriaCustomizacao): Promise<string> => {
    console.log("🟢 MateriaCustomizacaoDAO.create()");

    const SQL = `
      INSERT INTO materiacustomizacao (MateriaCustomizacaoGUID, MateriaGUID, UsuarioGUID, ImagemUrl, CorFundo, MensagemBoasVindas)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      customizacao.MateriaCustomizacaoGUID,
      customizacao.MateriaGUID,
      customizacao.UsuarioGUID,
      customizacao.ImagemUrl,
      customizacao.CorFundo,
      customizacao.MensagemBoasVindas,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return customizacao.MateriaCustomizacaoGUID;
  };

  findByMateriaEProfessor = async (materiaGUID: string, usuarioGUID: string): Promise<MateriaCustomizacao | null> => {
    console.log("🟢 MateriaCustomizacaoDAO.findByMateriaEProfessor()");

    const SQL = `SELECT * FROM materiacustomizacao WHERE MateriaGUID = ? AND UsuarioGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materiaGUID, usuarioGUID]);

    const lista = this.mapRows(rows as MateriaCustomizacaoRow[]);
    return lista[0] || null;
  };

  findAllByMateria = async (materiaGUID: string): Promise<MateriaCustomizacao[]> => {
    console.log("🟢 MateriaCustomizacaoDAO.findAllByMateria()");

    const SQL = `SELECT * FROM materiacustomizacao WHERE MateriaGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materiaGUID]);

    return this.mapRows(rows as MateriaCustomizacaoRow[]);
  };

  upsert = async (customizacao: MateriaCustomizacao): Promise<void> => {
    console.log("🟢 MateriaCustomizacaoDAO.upsert()");

    const existente = await this.findByMateriaEProfessor(customizacao.MateriaGUID, customizacao.UsuarioGUID);
    if (existente) {
      const SQL = `
        UPDATE materiacustomizacao
        SET ImagemUrl = ?, CorFundo = ?, MensagemBoasVindas = ?, UpdatedAt = CURRENT_TIMESTAMP
        WHERE MateriaCustomizacaoGUID = ?;
      `;
      const pool = await this.#database.getPool();
      await pool.execute(SQL, [
        customizacao.ImagemUrl,
        customizacao.CorFundo,
        customizacao.MensagemBoasVindas,
        existente.MateriaCustomizacaoGUID,
      ]);
      return;
    }

    await this.create(customizacao);
  };

  private mapRows(rows: MateriaCustomizacaoRow[]): MateriaCustomizacao[] {
    return rows.map((row) => {
      const customizacao = new MateriaCustomizacao();
      customizacao.MateriaCustomizacaoGUID = row.MateriaCustomizacaoGUID;
      customizacao.MateriaGUID = row.MateriaGUID;
      customizacao.UsuarioGUID = row.UsuarioGUID;
      customizacao.ImagemUrl = row.ImagemUrl;
      customizacao.CorFundo = row.CorFundo;
      customizacao.MensagemBoasVindas = row.MensagemBoasVindas;
      customizacao.CreatedAt = new Date(row.CreatedAt);
      customizacao.UpdatedAt = new Date(row.UpdatedAt);
      return customizacao;
    });
  }
}
