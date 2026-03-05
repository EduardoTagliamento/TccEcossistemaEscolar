import MysqlDatabase from "../database/MysqlDatabase";
import Usuario from "../entities/usuario.model";

interface UsuarioRow {
  UsuarioCPF: string;
  UsuarioEmail: string | null;
  UsuarioId: string | null;
  UsuarioTelefone: string | null;
  UsuarioNome: string;
  UsuarioSenha: string;
}

export class UsuarioDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  UsuarioDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (usuario: Usuario): Promise<string> => {
    console.log("🟢 UsuarioDAO.create()");

    const SQL = `
      INSERT INTO usuario
      (UsuarioCPF, UsuarioEmail, UsuarioId, UsuarioTelefone, UsuarioNome, UsuarioSenha)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      usuario.UsuarioCPF,
      usuario.UsuarioEmail,
      usuario.UsuarioId,
      usuario.UsuarioTelefone,
      usuario.UsuarioNome,
      usuario.UsuarioSenha,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return usuario.UsuarioCPF;
  };

  delete = async (UsuarioCPF: string): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.delete()");

    const SQL = "DELETE FROM usuario WHERE UsuarioCPF = ?;";
    const params = [UsuarioCPF];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  update = async (usuario: Usuario): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.update()");

    const SQL = `
      UPDATE usuario
      SET UsuarioEmail = ?, UsuarioId = ?, UsuarioTelefone = ?, UsuarioNome = ?, UsuarioSenha = ?
      WHERE UsuarioCPF = ?;
    `;
    const params = [
      usuario.UsuarioEmail,
      usuario.UsuarioId,
      usuario.UsuarioTelefone,
      usuario.UsuarioNome,
      usuario.UsuarioSenha,
      usuario.UsuarioCPF,
    ];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  findAll = async (nome?: string): Promise<Usuario[]> => {
    console.log("🟢 UsuarioDAO.findAll()");

    let SQL = "SELECT * FROM usuario";
    const params: string[] = [];

    if (nome) {
      SQL += " WHERE UsuarioNome LIKE ?";
      params.push(`%${nome}%`);
    }

    SQL += " ORDER BY UsuarioNome;";

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, params);

    const usuarios = (linhas as UsuarioRow[]).map((row) => this.mapRowToEntity(row));
    return usuarios;
  };

  findById = async (UsuarioCPF: string): Promise<Usuario | null> => {
    console.log("🟢 UsuarioDAO.findById()");

    const SQL = "SELECT * FROM usuario WHERE UsuarioCPF = ?;";
    const params = [UsuarioCPF];

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, params);

    const rows = linhas as UsuarioRow[];
    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  };

  findByEmail = async (UsuarioEmail: string): Promise<Usuario | null> => {
    console.log("🟢 UsuarioDAO.findByEmail()");

    const SQL = "SELECT * FROM usuario WHERE UsuarioEmail = ?;";
    const params = [UsuarioEmail];

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, params);

    const rows = linhas as UsuarioRow[];
    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  };

  findByField = async (field: string, value: string): Promise<Usuario[]> => {
    console.log("🟢 UsuarioDAO.findByField()");

    const validFields = ["UsuarioCPF", "UsuarioEmail", "UsuarioId", "UsuarioNome"];
    if (!validFields.includes(field)) {
      throw new Error(`Campo inválido: ${field}`);
    }

    const SQL = `SELECT * FROM usuario WHERE ${field} = ?;`;
    const params = [value];

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, params);

    const usuarios = (linhas as UsuarioRow[]).map((row) => this.mapRowToEntity(row));
    return usuarios;
  };

  private mapRowToEntity = (row: UsuarioRow): Usuario => {
    const usuario = new Usuario();
    usuario.UsuarioCPF = row.UsuarioCPF;
    usuario.UsuarioEmail = row.UsuarioEmail;
    usuario.UsuarioId = row.UsuarioId;
    usuario.UsuarioTelefone = row.UsuarioTelefone;
    usuario.UsuarioNome = row.UsuarioNome;
    usuario.UsuarioSenha = row.UsuarioSenha;
    return usuario;
  };
}
