import MysqlDatabase from "../database/MysqlDatabase";
import Usuario from "../entities/usuario.model";

interface UsuarioRow {
  UsuarioGUID: string;
  UsuarioCPF: string | null;
  UsuarioEmail: string | null;
  UsuarioFotoUrl: string | null;
  UsuarioTema: "light" | "dark" | "system";
  UsuarioModoDaltonico: number; // MySQL retorna 0 ou 1
  UsuarioEscalaFonte: "small" | "medium" | "large";
  UsuarioReduzirMovimento: number; // MySQL retorna 0 ou 1
  UsuarioAltoContraste: number; // MySQL retorna 0 ou 1
  UsuarioId: string | null;
  UsuarioTelefone: string | null;
  UsuarioNome: string;
  UsuarioSenha: string;
  UsuarioEmailVerificado: number; // MySQL retorna 0 ou 1
  UsuarioDataNascimento: Date | null;
  UsuarioStatus: "Ativo" | "Inativo" | "Bloqueado";
  UsuarioIsPlataformaAdmin: number; // MySQL retorna 0 ou 1
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
      (UsuarioGUID, UsuarioCPF, UsuarioEmail, UsuarioId, UsuarioTelefone, UsuarioNome, UsuarioSenha,
       UsuarioEmailVerificado, UsuarioDataNascimento, UsuarioStatus)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      usuario.UsuarioGUID,
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

    return usuario.UsuarioGUID;
  };

  delete = async (UsuarioGUID: string): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.delete() - Soft Delete");

    const SQL = `
      UPDATE usuario
      SET UsuarioDeletedAt = CURRENT_TIMESTAMP
      WHERE UsuarioGUID = ? AND UsuarioDeletedAt IS NULL;
    `;
    const params = [UsuarioGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  /**
   * Concede/revoga a flag de admin de plataforma (spec item 13) — fora do
   * fluxo normal de update de perfil; hoje só usado via script/acesso
   * direto ao banco (bootstrap manual), sem tela própria nesta fase.
   */
  atualizarPlataformaAdmin = async (usuarioGUID: string, isPlataformaAdmin: boolean): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.atualizarPlataformaAdmin()");

    const SQL = `UPDATE usuario SET UsuarioIsPlataformaAdmin = ? WHERE UsuarioGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [isPlataformaAdmin, usuarioGUID]);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  update = async (usuario: Usuario): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.update()");

    const SQL = `
      UPDATE usuario
      SET UsuarioCPF = ?, UsuarioEmail = ?, UsuarioFotoUrl = ?, UsuarioTema = ?, UsuarioModoDaltonico = ?, UsuarioEscalaFonte = ?,
          UsuarioReduzirMovimento = ?, UsuarioAltoContraste = ?, UsuarioId = ?, UsuarioTelefone = ?, UsuarioNome = ?, UsuarioSenha = ?,
          UsuarioEmailVerificado = ?, UsuarioDataNascimento = ?, UsuarioStatus = ?
      WHERE UsuarioGUID = ? AND UsuarioDeletedAt IS NULL;
    `;
    const params = [
      usuario.UsuarioCPF,
      usuario.UsuarioEmail,
      usuario.UsuarioFotoUrl,
      usuario.UsuarioTema,
      usuario.UsuarioModoDaltonico,
      usuario.UsuarioEscalaFonte,
      usuario.UsuarioReduzirMovimento,
      usuario.UsuarioAltoContraste,
      usuario.UsuarioId,
      usuario.UsuarioTelefone,
      usuario.UsuarioNome,
      usuario.UsuarioSenha,
      usuario.UsuarioEmailVerificado,
      usuario.UsuarioDataNascimento,
      usuario.UsuarioStatus,
      usuario.UsuarioGUID,
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

  /**
   * Busca por nome (parcial) pensada pra desambiguação de "essa pessoa já é
   * usuária da plataforma?" nas telas de Gestão de Dados (ver
   * docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md) — CPF virou opcional, então
   * nome é o novo identificador de busca. Nomes que começam com o termo
   * digitado vêm primeiro (mais provável de ser o que a pessoa quer),
   * limitado pra nunca devolver uma lista gigante de "quase match".
   */
  searchByNome = async (nome: string, limit: number = 10): Promise<Usuario[]> => {
    console.log("🟢 UsuarioDAO.searchByNome()");

    const SQL = `
      SELECT * FROM usuario
      WHERE UsuarioDeletedAt IS NULL AND UsuarioNome LIKE ?
      ORDER BY (UsuarioNome LIKE ?) DESC, UsuarioNome ASC
      LIMIT ?
    `;
    const termoContem = `%${nome}%`;
    const termoComeca = `${nome}%`;
    const params = [termoContem, termoComeca, limit];

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, params);

    return (linhas as UsuarioRow[]).map((row) => this.mapRowToEntity(row));
  };

  findByGUID = async (UsuarioGUID: string): Promise<Usuario | null> => {
    console.log("🟢 UsuarioDAO.findByGUID()");

    const SQL = "SELECT * FROM usuario WHERE UsuarioGUID = ? AND UsuarioDeletedAt IS NULL;";
    const params = [UsuarioGUID];

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

  findByTelefone = async (UsuarioTelefone: string): Promise<Usuario | null> => {
    console.log("🟢 UsuarioDAO.findByTelefone()");

    const SQL = "SELECT * FROM usuario WHERE UsuarioTelefone = ? AND UsuarioDeletedAt IS NULL;";
    const params = [UsuarioTelefone];

    const pool = await this.#database.getPool();
    const [linhas] = await pool.execute(SQL, params);

    const rows = linhas as UsuarioRow[];
    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(rows[0]);
  };

  findByCPF = async (UsuarioCPF: string): Promise<Usuario | null> => {
    console.log("🟢 UsuarioDAO.findByCPF()");

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

  /** Nomes em lote por GUID — usado para enriquecer listagens (ex.: escolaxusuarioxfuncao) sem N+1. */
  findNomesByGUIDs = async (guids: string[]): Promise<Map<string, string>> => {
    console.log("🟢 UsuarioDAO.findNomesByGUIDs()");
    if (guids.length === 0) return new Map();

    const pool = await this.#database.getPool();
    const placeholders = guids.map(() => "?").join(",");
    const [linhas] = await pool.execute(
      `SELECT UsuarioGUID, UsuarioNome FROM usuario WHERE UsuarioGUID IN (${placeholders})`,
      guids
    );
    return new Map((linhas as Array<{ UsuarioGUID: string; UsuarioNome: string }>).map((r) => [r.UsuarioGUID, r.UsuarioNome]));
  };

  /** Nome + CPF em lote — usado por DTOs que exibem CPF como dado informativo (não identificador). */
  findNomesECPFsByGUIDs = async (guids: string[]): Promise<Map<string, { UsuarioNome: string; UsuarioCPF: string | null }>> => {
    console.log("🟢 UsuarioDAO.findNomesECPFsByGUIDs()");
    if (guids.length === 0) return new Map();

    const pool = await this.#database.getPool();
    const placeholders = guids.map(() => "?").join(",");
    const [linhas] = await pool.execute(
      `SELECT UsuarioGUID, UsuarioNome, UsuarioCPF FROM usuario WHERE UsuarioGUID IN (${placeholders})`,
      guids
    );
    return new Map(
      (linhas as Array<{ UsuarioGUID: string; UsuarioNome: string; UsuarioCPF: string | null }>).map((r) => [
        r.UsuarioGUID,
        { UsuarioNome: r.UsuarioNome, UsuarioCPF: r.UsuarioCPF },
      ])
    );
  };

  findByField = async (field: string, value: string): Promise<Usuario[]> => {
    console.log("🟢 UsuarioDAO.findByField()");

    const validFields = ["UsuarioGUID", "UsuarioCPF", "UsuarioEmail", "UsuarioId", "UsuarioNome"];
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
  updateUltimoAcesso = async (UsuarioGUID: string): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.updateUltimoAcesso()");

    const SQL = `
      UPDATE usuario
      SET UsuarioUltimoAcesso = CURRENT_TIMESTAMP
      WHERE UsuarioGUID = ? AND UsuarioDeletedAt IS NULL;
    `;
    const params = [UsuarioGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  /**
   * Marca email do usuário como verificado
   */
  verificarEmail = async (UsuarioGUID: string): Promise<boolean> => {
    console.log("🟢 UsuarioDAO.verificarEmail()");

    const SQL = `
      UPDATE usuario
      SET UsuarioEmailVerificado = TRUE
      WHERE UsuarioGUID = ? AND UsuarioDeletedAt IS NULL;
    `;
    const params = [UsuarioGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRowToEntity = (row: UsuarioRow): Usuario => {
    const usuario = new Usuario();
    usuario.UsuarioGUID = row.UsuarioGUID;
    usuario.UsuarioCPF = row.UsuarioCPF;
    usuario.UsuarioEmail = row.UsuarioEmail;
    usuario.UsuarioFotoUrl = row.UsuarioFotoUrl;
    usuario.UsuarioTema = row.UsuarioTema ?? "system";
    usuario.UsuarioModoDaltonico = Boolean(row.UsuarioModoDaltonico);
    usuario.UsuarioEscalaFonte = row.UsuarioEscalaFonte ?? "medium";
    usuario.UsuarioReduzirMovimento = Boolean(row.UsuarioReduzirMovimento);
    usuario.UsuarioAltoContraste = Boolean(row.UsuarioAltoContraste);
    usuario.UsuarioId = row.UsuarioId;
    usuario.UsuarioTelefone = row.UsuarioTelefone;
    usuario.UsuarioNome = row.UsuarioNome;
    usuario.UsuarioSenha = row.UsuarioSenha;
    usuario.UsuarioEmailVerificado = Boolean(row.UsuarioEmailVerificado);
    usuario.UsuarioDataNascimento = row.UsuarioDataNascimento ? new Date(row.UsuarioDataNascimento) : null;
    usuario.UsuarioStatus = row.UsuarioStatus;
    usuario.UsuarioIsPlataformaAdmin = Boolean(row.UsuarioIsPlataformaAdmin);
    usuario.UsuarioUltimoAcesso = row.UsuarioUltimoAcesso ? new Date(row.UsuarioUltimoAcesso) : null;
    usuario.UsuarioCreatedAt = new Date(row.UsuarioCreatedAt);
    usuario.UsuarioUpdatedAt = new Date(row.UsuarioUpdatedAt);
    usuario.UsuarioDeletedAt = row.UsuarioDeletedAt ? new Date(row.UsuarioDeletedAt) : null;
    return usuario;
  };
}
