import MysqlDatabase from "../database/MysqlDatabase";
import RedefinicaoSenha from "../entities/redefinicao-senha.model";

interface RedefinicaoSenhaRow {
  RedefinicaoId: number;
  UsuarioGUID: string;
  RedefinicaoToken: string;
  RedefinicaoExpiresAt: Date;
  RedefinicaoUsado: number; // MySQL retorna 0 ou 1
  RedefinicaoCreatedAt: Date;
}

export class RedefinicaoSenhaDAO {
  #database: MysqlDatabase;

  constructor(databaseDependency: MysqlDatabase) {
    console.log("⬆️  RedefinicaoSenhaDAO.constructor()");
    this.#database = databaseDependency;
  }

  /**
   * Cria novo registro de redefinição
   */
  async create(redefinicao: RedefinicaoSenha): Promise<RedefinicaoSenha> {
    console.log("🔵 RedefinicaoSenhaDAO.create()");

    const sql = `
      INSERT INTO redefinicao_senha (
        UsuarioGUID, RedefinicaoToken, RedefinicaoExpiresAt
      ) VALUES (?, ?, ?)
    `;

    const params = [
      redefinicao.UsuarioGUID,
      redefinicao.RedefinicaoToken,
      redefinicao.RedefinicaoExpiresAt,
    ];

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, params);

    redefinicao.RedefinicaoId = (result as { insertId: number }).insertId;
    return redefinicao;
  }

  /**
   * Busca token válido (não expirado, não usado)
   */
  async findValidToken(token: string): Promise<RedefinicaoSenha | null> {
    console.log("🔵 RedefinicaoSenhaDAO.findValidToken()");

    const sql = `
      SELECT * FROM redefinicao_senha
      WHERE RedefinicaoToken = ?
        AND RedefinicaoUsado = FALSE
        AND RedefinicaoExpiresAt > NOW()
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(sql, [token]);

    const linhas = rows as RedefinicaoSenhaRow[];
    if (linhas.length === 0) {
      return null;
    }

    return this.mapRowToEntity(linhas[0]);
  }

  /**
   * Marca token como usado
   */
  async markAsUsed(id: number): Promise<boolean> {
    console.log("🔵 RedefinicaoSenhaDAO.markAsUsed()");

    const sql = `
      UPDATE redefinicao_senha
      SET RedefinicaoUsado = TRUE
      WHERE RedefinicaoId = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, [id]);
    return (result as { affectedRows: number }).affectedRows > 0;
  }

  /**
   * Invalida todos os tokens não usados de um usuário (ao gerar novo, ou
   * após redefinir com sucesso — um link de reset antigo não deve continuar
   * valendo depois que a senha já foi trocada por outro)
   */
  async invalidateOldTokens(usuarioGUID: string): Promise<boolean> {
    console.log("🔵 RedefinicaoSenhaDAO.invalidateOldTokens()");

    const sql = `
      UPDATE redefinicao_senha
      SET RedefinicaoUsado = TRUE
      WHERE UsuarioGUID = ?
        AND RedefinicaoUsado = FALSE
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, [usuarioGUID]);
    return (result as { affectedRows: number }).affectedRows >= 0;
  }

  /**
   * Conta tentativas de solicitação nas últimas N horas (anti-spam)
   */
  async countRecentAttempts(usuarioGUID: string, hours: number = 1): Promise<number> {
    console.log("🔵 RedefinicaoSenhaDAO.countRecentAttempts()");

    const sql = `
      SELECT COUNT(*) as total
      FROM redefinicao_senha
      WHERE UsuarioGUID = ?
        AND RedefinicaoCreatedAt > DATE_SUB(NOW(), INTERVAL ? HOUR)
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(sql, [usuarioGUID, hours]);

    const linhas = rows as any[];
    return linhas[0]?.total || 0;
  }

  /**
   * Limpa tokens expirados (maintenance)
   */
  async deleteExpired(): Promise<number> {
    console.log("🔵 RedefinicaoSenhaDAO.deleteExpired()");

    const sql = `
      DELETE FROM redefinicao_senha
      WHERE RedefinicaoExpiresAt < NOW()
        OR RedefinicaoCreatedAt < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, []);
    return (result as { affectedRows: number }).affectedRows;
  }

  /**
   * Mapeia Row do MySQL para Entity
   */
  private mapRowToEntity(row: RedefinicaoSenhaRow): RedefinicaoSenha {
    const redefinicao = new RedefinicaoSenha();

    redefinicao.RedefinicaoId = row.RedefinicaoId;
    redefinicao.UsuarioGUID = row.UsuarioGUID;
    redefinicao.RedefinicaoToken = row.RedefinicaoToken;
    redefinicao.RedefinicaoExpiresAt = new Date(row.RedefinicaoExpiresAt);
    redefinicao.RedefinicaoUsado = Boolean(row.RedefinicaoUsado);
    redefinicao.RedefinicaoCreatedAt = new Date(row.RedefinicaoCreatedAt);

    return redefinicao;
  }
}
