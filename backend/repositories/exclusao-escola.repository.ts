import MysqlDatabase from "../database/MysqlDatabase";
import ExclusaoEscola from "../entities/exclusao-escola.model";

interface ExclusaoEscolaRow {
  ExclusaoId: number;
  EscolaGUID: string;
  UsuarioGUIDSolicitante: string;
  ExclusaoCodigo: string;
  ExclusaoExpiresAt: Date;
  ExclusaoUsado: number; // MySQL retorna 0 ou 1
  ExclusaoCreatedAt: Date;
}

export class ExclusaoEscolaDAO {
  #database: MysqlDatabase;

  constructor(databaseDependency: MysqlDatabase) {
    console.log("⬆️  ExclusaoEscolaDAO.constructor()");
    this.#database = databaseDependency;
  }

  async create(exclusao: ExclusaoEscola): Promise<ExclusaoEscola> {
    console.log("🔵 ExclusaoEscolaDAO.create()");

    const sql = `
      INSERT INTO exclusao_escola (
        EscolaGUID, UsuarioGUIDSolicitante, ExclusaoCodigo, ExclusaoExpiresAt
      ) VALUES (?, ?, ?, ?)
    `;

    const params = [
      exclusao.EscolaGUID,
      exclusao.UsuarioGUIDSolicitante,
      exclusao.ExclusaoCodigo,
      exclusao.ExclusaoExpiresAt,
    ];

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, params);

    exclusao.ExclusaoId = (result as { insertId: number }).insertId;
    return exclusao;
  }

  /**
   * Busca código válido (não expirado, não usado) por escola + código.
   * Também exige que seja o mesmo usuário que solicitou — o código só vale
   * pra quem pediu, não pra qualquer Direção da escola.
   */
  async findValidCode(escolaGUID: string, usuarioGUIDSolicitante: string, codigo: string): Promise<ExclusaoEscola | null> {
    console.log("🔵 ExclusaoEscolaDAO.findValidCode()");

    const sql = `
      SELECT * FROM exclusao_escola
      WHERE EscolaGUID = ?
        AND UsuarioGUIDSolicitante = ?
        AND ExclusaoCodigo = ?
        AND ExclusaoUsado = FALSE
        AND ExclusaoExpiresAt > NOW()
      ORDER BY ExclusaoCreatedAt DESC
      LIMIT 1
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(sql, [escolaGUID, usuarioGUIDSolicitante, codigo]);

    const linhas = rows as ExclusaoEscolaRow[];
    if (linhas.length === 0) {
      return null;
    }

    return this.mapRowToEntity(linhas[0]);
  }

  async markAsUsed(id: number): Promise<boolean> {
    console.log("🔵 ExclusaoEscolaDAO.markAsUsed()");

    const sql = `UPDATE exclusao_escola SET ExclusaoUsado = TRUE WHERE ExclusaoId = ?`;
    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, [id]);
    return (result as { affectedRows: number }).affectedRows > 0;
  }

  async invalidateOldCodes(escolaGUID: string): Promise<boolean> {
    console.log("🔵 ExclusaoEscolaDAO.invalidateOldCodes()");

    const sql = `
      UPDATE exclusao_escola
      SET ExclusaoUsado = TRUE
      WHERE EscolaGUID = ?
        AND ExclusaoUsado = FALSE
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute(sql, [escolaGUID]);
    return (result as { affectedRows: number }).affectedRows >= 0;
  }

  /**
   * Conta tentativas de solicitação nas últimas N horas (anti-spam) — por
   * escola, não por usuário, pra não deixar alguém contornar o limite
   * pedindo por outra sessão/conta com a mesma escola.
   */
  async countRecentAttempts(escolaGUID: string, hours: number = 1): Promise<number> {
    console.log("🔵 ExclusaoEscolaDAO.countRecentAttempts()");

    const sql = `
      SELECT COUNT(*) as total
      FROM exclusao_escola
      WHERE EscolaGUID = ?
        AND ExclusaoCreatedAt > DATE_SUB(NOW(), INTERVAL ? HOUR)
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(sql, [escolaGUID, hours]);

    const linhas = rows as any[];
    return linhas[0]?.total || 0;
  }

  private mapRowToEntity(row: ExclusaoEscolaRow): ExclusaoEscola {
    const exclusao = new ExclusaoEscola();

    exclusao.ExclusaoId = row.ExclusaoId;
    exclusao.EscolaGUID = row.EscolaGUID;
    exclusao.UsuarioGUIDSolicitante = row.UsuarioGUIDSolicitante;
    exclusao.ExclusaoCodigo = row.ExclusaoCodigo;
    exclusao.ExclusaoExpiresAt = new Date(row.ExclusaoExpiresAt);
    exclusao.ExclusaoUsado = Boolean(row.ExclusaoUsado);
    exclusao.ExclusaoCreatedAt = new Date(row.ExclusaoCreatedAt);

    return exclusao;
  }
}
