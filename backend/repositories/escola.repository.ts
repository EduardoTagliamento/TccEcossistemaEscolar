import MysqlDatabase from "../database/MysqlDatabase";
import Escola from "../entities/escola.model";

interface EscolaRow {
  EscolaGUID: string;
  EscolaNome: string | null;
  EscolaCNPJ: string | null;
  EscolaTelefone: string | null;
  EscolaEmail: string | null;
  EscolaEndereco: string | null;
  EscolaCorPriEs: string | null;
  EscolaCorPriCl: string | null;
  EscolaCorSecEs: string | null;
  EscolaCorSecCl: string | null;
  EscolaIcone: Buffer | null;
  EscolaLogo: string | null;
  EscolaStatus: "Ativa" | "Inativa";
  EscolaCreatedAt: Date;
  EscolaUpdatedAt: Date;
}

export class EscolaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  EscolaDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (escola: Escola): Promise<string> => {
    console.log("🟢 EscolaDAO.create()");

    const SQL = `
      INSERT INTO escola
      (EscolaGUID, EscolaNome, EscolaCNPJ, EscolaTelefone, EscolaEmail, EscolaEndereco,
       EscolaCorPriEs, EscolaCorPriCl, EscolaCorSecEs, EscolaCorSecCl, EscolaIcone, EscolaLogo, EscolaStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      escola.EscolaGUID,
      escola.EscolaNome,
      escola.EscolaCNPJ,
      escola.EscolaTelefone,
      escola.EscolaEmail,
      escola.EscolaEndereco,
      escola.EscolaCorPriEs,
      escola.EscolaCorPriCl,
      escola.EscolaCorSecEs,
      escola.EscolaCorSecCl,
      escola.EscolaIcone,
      escola.EscolaLogo,
      escola.EscolaStatus,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return escola.EscolaGUID;
  };

  delete = async (EscolaGUID: string): Promise<boolean> => {
    console.log("🟢 EscolaDAO.delete()");

    const SQL = "DELETE FROM escola WHERE EscolaGUID = ?;";
    const params = [EscolaGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  update = async (escola: Escola): Promise<boolean> => {
    console.log("🟢 EscolaDAO.update()");

    const SQL = `
      UPDATE escola
      SET EscolaNome = ?, EscolaCNPJ = ?, EscolaTelefone = ?, EscolaEmail = ?, EscolaEndereco = ?,
          EscolaCorPriEs = ?, EscolaCorPriCl = ?, EscolaCorSecEs = ?, EscolaCorSecCl = ?,
          EscolaIcone = ?, EscolaLogo = ?, EscolaStatus = ?
      WHERE EscolaGUID = ?;
    `;
    const params = [
      escola.EscolaNome,
      escola.EscolaCNPJ,
      escola.EscolaTelefone,
      escola.EscolaEmail,
      escola.EscolaEndereco,
      escola.EscolaCorPriEs,
      escola.EscolaCorPriCl,
      escola.EscolaCorSecEs,
      escola.EscolaCorSecCl,
      escola.EscolaIcone,
      escola.EscolaLogo,
      escola.EscolaStatus,
      escola.EscolaGUID,
    ];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  findAll = async (nome?: string): Promise<Escola[]> => {
    console.log("🟢 EscolaDAO.findAll()");

    const pool = await this.#database.getPool();

    if (nome) {
      const SQL = `SELECT * FROM escola WHERE EscolaNome LIKE ? ORDER BY EscolaNome;`;
      const [rows] = await pool.execute(SQL, [`%${nome}%`]);
      return this.mapRows(rows as EscolaRow[]);
    }

    const SQL = `SELECT * FROM escola ORDER BY EscolaNome;`;
    const [rows] = await pool.execute(SQL);
    return this.mapRows(rows as EscolaRow[]);
  };

  findById = async (EscolaGUID: string): Promise<Escola | null> => {
    console.log("🟢 EscolaDAO.findById()");

    const resultado = await this.findByField("EscolaGUID", EscolaGUID);
    return resultado[0] || null;
  };

  findByField = async (field: string, value: unknown): Promise<Escola[]> => {
    console.log(`🟢 EscolaDAO.findByField() - Campo: ${field}, Valor: ${value}`);

    const allowedFields = [
      "EscolaGUID",
      "EscolaNome",
      "EscolaCNPJ",
      "EscolaEmail",
      "EscolaStatus",
      "EscolaCorPriEs",
      "EscolaCorPriCl",
      "EscolaCorSecEs",
      "EscolaCorSecCl",
    ];
    if (!allowedFields.includes(field)) {
      throw new Error("Campo inválido para busca");
    }

    const SQL = `SELECT * FROM escola WHERE ${field} = ?;`;
    const params = [value];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, params);

    return this.mapRows(rows as EscolaRow[]);
  };

  private mapRows(rows: EscolaRow[]): Escola[] {
    return rows.map((row) => {
      const escola = new Escola();
      escola.EscolaGUID = row.EscolaGUID;
      escola.EscolaNome = row.EscolaNome;
      escola.EscolaCNPJ = row.EscolaCNPJ;
      escola.EscolaTelefone = row.EscolaTelefone;
      escola.EscolaEmail = row.EscolaEmail;
      escola.EscolaEndereco = row.EscolaEndereco;
      escola.EscolaCorPriEs = row.EscolaCorPriEs;
      escola.EscolaCorPriCl = row.EscolaCorPriCl;
      escola.EscolaCorSecEs = row.EscolaCorSecEs;
      escola.EscolaCorSecCl = row.EscolaCorSecCl;
      escola.EscolaIcone = row.EscolaIcone;
      escola.EscolaLogo = row.EscolaLogo;
      escola.EscolaStatus = row.EscolaStatus;
      escola.EscolaCreatedAt = new Date(row.EscolaCreatedAt);
      escola.EscolaUpdatedAt = new Date(row.EscolaUpdatedAt);
      return escola;
    });
  }
}