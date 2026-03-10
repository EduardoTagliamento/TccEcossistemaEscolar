import MysqlDatabase from "../database/MysqlDatabase.js";
import VerificacaoEmail from "../entities/verificacao-email.model.js";

interface VerificacaoEmailRow {
  VerificacaoId: number;
  UsuarioCPF: string;
  VerificacaoCodigo: string;
  VerificacaoExpiresAt: Date;
  VerificacaoUsado: number; // MySQL retorna 0 ou 1
  VerificacaoCreatedAt: Date;
}

export class VerificacaoEmailDAO {
  #database: MysqlDatabase;

  constructor(databaseDependency: MysqlDatabase) {
    console.log("⬆️  VerificacaoEmailDAO.constructor()");
    this.#database = databaseDependency;
  }

  /**
   * Cria novo registro de verificação
   */
  async create(verificacao: VerificacaoEmail): Promise<VerificacaoEmail> {
    console.log("🔵 VerificacaoEmailDAO.create()");

    const sql = `
      INSERT INTO verificacao_email (
        UsuarioCPF, VerificacaoCodigo, VerificacaoExpiresAt
      ) VALUES (?, ?, ?)
    `;

    const params = [
      verificacao.UsuarioCPF,
      verificacao.VerificacaoCodigo,
      verificacao.VerificacaoExpiresAt,
    ];

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, params);
    
    verificacao.VerificacaoId = (result as { insertId: number }).insertId;
    return verificacao;
  }

  /**
   * Busca código válido (não expirado, não usado) por CPF e Código
   */
  async findValidCode(cpf: string, codigo: string): Promise<VerificacaoEmail | null> {
    console.log("🔵 VerificacaoEmailDAO.findValidCode()");

    const sql = `
      SELECT * FROM verificacao_email
      WHERE UsuarioCPF = ?
        AND VerificacaoCodigo = ?
        AND VerificacaoUsado = FALSE
        AND VerificacaoExpiresAt > NOW()
      ORDER BY VerificacaoCreatedAt DESC
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(sql, [cpf, codigo]);
    
    const linhas = rows as VerificacaoEmailRow[];
    if (linhas.length === 0) {
      return null;
    }

    return this.mapRowToEntity(linhas[0]);
  }

  /**
   * Marca código como usado
   */
  async markAsUsed(id: number): Promise<boolean> {
    console.log("🔵 VerificacaoEmailDAO.markAsUsed()");

    const sql = `
      UPDATE verificacao_email
      SET VerificacaoUsado = TRUE
      WHERE VerificacaoId = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, [id]);
    return (result as { affectedRows: number }).affectedRows > 0;
  }

  /**
   * Invalida todos os códigos não usados de um CPF (ao gerar novo)
   */
  async invalidateOldCodes(cpf: string): Promise<boolean> {
    console.log("🔵 VerificacaoEmailDAO.invalidateOldCodes()");

    const sql = `
      UPDATE verificacao_email
      SET VerificacaoUsado = TRUE
      WHERE UsuarioCPF = ?
        AND VerificacaoUsado = FALSE
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, [cpf]);
    return (result as { affectedRows: number }).affectedRows >= 0; // Pode ser 0 se não houver códigos antigos
  }

  /**
   * Conta tentativas de solicitação nas últimas N horas (anti-spam)
   */
  async countRecentAttempts(cpf: string, hours: number = 1): Promise<number> {
    console.log("🔵 VerificacaoEmailDAO.countRecentAttempts()");

    const sql = `
      SELECT COUNT(*) as total
      FROM verificacao_email
      WHERE UsuarioCPF = ?
        AND VerificacaoCreatedAt > DATE_SUB(NOW(), INTERVAL ? HOUR)
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(sql, [cpf, hours]);
    
    const linhas = rows as any[];
    return linhas[0]?.total || 0;
  }

  /**
   * Limpa códigos expirados (maintenance)
   */
  async deleteExpired(): Promise<number> {
    console.log("🔵 VerificacaoEmailDAO.deleteExpired()");

    const sql = `
      DELETE FROM verificacao_email
      WHERE VerificacaoExpiresAt < NOW()
        OR VerificacaoCreatedAt < DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, []);
    return (result as { affectedRows: number }).affectedRows;
  }

  /**
   * Mapeia Row do MySQL para Entity
   */
  private mapRowToEntity(row: VerificacaoEmailRow): VerificacaoEmail {
    const verificacao = new VerificacaoEmail();
    
    verificacao.VerificacaoId = row.VerificacaoId;
    verificacao.UsuarioCPF = row.UsuarioCPF;
    verificacao.VerificacaoCodigo = row.VerificacaoCodigo;
    verificacao.VerificacaoExpiresAt = new Date(row.VerificacaoExpiresAt);
    verificacao.VerificacaoUsado = Boolean(row.VerificacaoUsado);
    verificacao.VerificacaoCreatedAt = new Date(row.VerificacaoCreatedAt);

    return verificacao;
  }
}
