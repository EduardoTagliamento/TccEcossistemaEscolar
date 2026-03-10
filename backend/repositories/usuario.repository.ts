import MysqlDatabase from "../database/MysqlDatabase";
import Usuario from "../entities/usuario.model";

interface UsuarioRow {
  UsuarioCPF: string;
  UsuarioEmail: string | null;
  UsuarioId: string | null;
  UsuarioTelefone: string | null;
  UsuarioNome: string;
  UsuarioSenha: string;
  UsuarioEmailVerificado: number; // MySQL retorna 0 ou 1
  UsuarioDataNascimento: Date | null;
  UsuarioStatus: "Ativo" | "Inativo" | "Bloqueado";
  UsuarioUltimoAcesso: Date | null;
  UsuarioCreatedAt: Date;
  UsuarioUpdatedAt: Date;
  UsuarioDeletedAt: Date | null;
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
      (UsuarioCPF, UsuarioEmail, UsuarioId, UsuarioTelefone, UsuarioNome, UsuarioSenha,
       UsuarioEmailVerificado, UsuarioDataNascimento, UsuarioStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      usuario.UsuarioCPF,
      usuario.UsuarioEmail,
      usuario.UsuarioId,
      usuario.UsuarioTelefone,
      usuario.UsuarioNome,
      usuario.UsuarioSenha,
      usuario.UsuarioEmailVerificado,
      usuario.UsuarioDataNascimento,
      usuario.UsuarioStatus,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return usuario.UsuarioCPF;
  };

  delete = async (UsuarioCPF: string): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.delete() - Soft Delete");

    const SQL = `
      UPDATE usuario
      SET UsuarioDeletedAt = CURRENT_TIMESTAMP
      WHERE UsuarioCPF = ? AND UsuarioDeletedAt IS NULL;
    `;
    const params = [UsuarioCPF];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  update = async (usuario: Usuario): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.update()");

    const SQL = `
      UPDATE usuario
      SET UsuarioEmail = ?, UsuarioId = ?, UsuarioTelefone = ?, UsuarioNome = ?, UsuarioSenha = ?,
          UsuarioEmailVerificado = ?, UsuarioDataNascimento = ?, UsuarioStatus = ?
      WHERE UsuarioCPF = ? AND UsuarioDeletedAt IS NULL;
    `;
    const params = [
      usuario.UsuarioEmail,
      usuario.UsuarioId,
      usuario.UsuarioTelefone,
      usuario.UsuarioNome,
      usuario.UsuarioSenha,
      usuario.UsuarioEmailVerificado,
      usuario.UsuarioDataNascimento,
      usuario.UsuarioStatus,
      usuario.UsuarioCPF,
    ];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  findAll = async (nome?: string): Promise<Usuario[]> => {
    console.log("🟢 UsuarioDAO.findAll()");

    let SQL = "SELECT * FROM usuario WHERE UsuarioDeletedAt IS NULL";
    const params: string[] = [];

    if (nome) {
      SQL += " AND UsuarioNome LIKE ?";
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

    const SQL = "SELECT * FROM usuario WHERE UsuarioCPF = ? AND UsuarioDeletedAt IS NULL;";
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

    const SQL = "SELECT * FROM usuario WHERE UsuarioEmail = ? AND UsuarioDeletedAt IS NULL;";
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

    const SQL = `SELECT * FROM usuario WHERE ${field} = ? AND UsuarioDeletedAt IS NULL;`;
    const params = [value];

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, params);

    const usuarios = (linhas as UsuarioRow[]).map((row) => this.mapRowToEntity(row));
    return usuarios;
  };

  /**
   * Atualiza o último acesso do usuário (usado no login)
   */
  updateUltimoAcesso = async (UsuarioCPF: string): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.updateUltimoAcesso()");

    const SQL = `
      UPDATE usuario
      SET UsuarioUltimoAcesso = CURRENT_TIMESTAMP
      WHERE UsuarioCPF = ? AND UsuarioDeletedAt IS NULL;
    `;
    const params = [UsuarioCPF];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  /**
   * Marca email do usuário como verificado
   */
  verificarEmail = async (UsuarioCPF: string): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.verificarEmail()");

    const SQL = `
      UPDATE usuario
      SET UsuarioEmailVerificado = TRUE
      WHERE UsuarioCPF = ? AND UsuarioDeletedAt IS NULL;
    `;
    const params = [UsuarioCPF];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRowToEntity = (row: UsuarioRow): Usuario => {
    const usuario = new Usuario();
    usuario.UsuarioCPF = row.UsuarioCPF;
    usuario.UsuarioEmail = row.UsuarioEmail;
    usuario.UsuarioId = row.UsuarioId;
    usuario.UsuarioTelefone = row.UsuarioTelefone;
    usuario.UsuarioNome = row.UsuarioNome;
    usuario.UsuarioSenha = row.UsuarioSenha;
    usuario.UsuarioEmailVerificado = Boolean(row.UsuarioEmailVerificado);
    usuario.UsuarioDataNascimento = row.UsuarioDataNascimento ? new Date(row.UsuarioDataNascimento) : null;
    usuario.UsuarioStatus = row.UsuarioStatus;
    usuario.UsuarioUltimoAcesso = row.UsuarioUltimoAcesso ? new Date(row.UsuarioUltimoAcesso) : null;
    usuario.UsuarioCreatedAt = new Date(row.UsuarioCreatedAt);
    usuario.UsuarioUpdatedAt = new Date(row.UsuarioUpdatedAt);
    usuario.UsuarioDeletedAt = row.UsuarioDeletedAt ? new Date(row.UsuarioDeletedAt) : null;
    return usuario;
  };
}
