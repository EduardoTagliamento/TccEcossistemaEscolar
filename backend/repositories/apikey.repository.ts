/**
 * 🟢 Repository - ApiKey
 *
 * Camada de acesso a dados para chaves de API de parceiros externos.
 * Ver docs/PLANO_IMPLEMENTACAO_API_KEYS.md.
 */

import MysqlDatabase from "../database/MysqlDatabase";
import ApiKey from "../entities/apikey.model";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export class ApiKeyDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 ApiKeyDAO.constructor()");
    this.#database = database;
  }

  async create(apiKey: ApiKey): Promise<ApiKey> {
    console.log("🟢 ApiKeyDAO.create()");

    const query = `
      INSERT INTO apikey (
        ApiKeyGUID, EscolaGUID, ApiKeyNome, ApiKeyPrefixo, ApiKeyHashSecreto,
        ApiKeyEscopos, ApiKeyStatus, ApiKeyCriadoPorGUID
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      apiKey.ApiKeyGUID,
      apiKey.EscolaGUID,
      apiKey.ApiKeyNome,
      apiKey.ApiKeyPrefixo,
      apiKey.ApiKeyHashSecreto,
      JSON.stringify(apiKey.ApiKeyEscopos),
      apiKey.ApiKeyStatus,
      apiKey.ApiKeyCriadoPorGUID,
    ];

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, params);

    const created = await this.findById(apiKey.ApiKeyGUID);
    if (!created) {
      throw new Error("Falha ao criar chave de API");
    }
    return created;
  }

  async findById(guid: string): Promise<ApiKey | null> {
    console.log("🟢 ApiKeyDAO.findById()");

    const query = `SELECT * FROM apikey WHERE ApiKeyGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [guid]);

    if (rows.length === 0) return null;
    return this.#mapRowToApiKey(rows[0]);
  }

  /**
   * Lookup pelo hash do segredo — chamado a cada requisição autenticada por
   * chave (`ApiKeyMiddleware.authenticate`), por isso indexado por UNIQUE.
   */
  async findByHash(hash: string): Promise<ApiKey | null> {
    console.log("🟢 ApiKeyDAO.findByHash()");

    const query = `SELECT * FROM apikey WHERE ApiKeyHashSecreto = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [hash]);

    if (rows.length === 0) return null;
    return this.#mapRowToApiKey(rows[0]);
  }

  async findAllByEscola(escolaGUID: string): Promise<ApiKey[]> {
    console.log("🟢 ApiKeyDAO.findAllByEscola()");

    const query = `SELECT * FROM apikey WHERE EscolaGUID = ? ORDER BY ApiKeyCreatedAt DESC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [escolaGUID]);

    return rows.map((row) => this.#mapRowToApiKey(row));
  }

  async revoke(guid: string): Promise<boolean> {
    console.log("🟢 ApiKeyDAO.revoke()");

    const query = `UPDATE apikey SET ApiKeyStatus = 'Revogada', ApiKeyUpdatedAt = NOW() WHERE ApiKeyGUID = ?`;
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [guid]);

    return result.affectedRows > 0;
  }

  /**
   * Fire-and-forget: atualiza o timestamp de último uso. Nunca deve
   * bloquear nem derrubar a requisição autenticada que a disparou — quem
   * chama (`ApiKeyMiddleware.authenticate`) não espera essa promise.
   */
  async touchUltimoUso(guid: string): Promise<void> {
    const query = `UPDATE apikey SET ApiKeyUltimoUsoEm = NOW() WHERE ApiKeyGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [guid]);
  }

  #mapRowToApiKey(row: any): ApiKey {
    return ApiKey.fromPlainObject({
      ApiKeyGUID: row.ApiKeyGUID,
      EscolaGUID: row.EscolaGUID,
      ApiKeyNome: row.ApiKeyNome,
      ApiKeyPrefixo: row.ApiKeyPrefixo,
      ApiKeyHashSecreto: row.ApiKeyHashSecreto,
      ApiKeyEscopos: row.ApiKeyEscopos,
      ApiKeyStatus: row.ApiKeyStatus,
      ApiKeyCriadoPorGUID: row.ApiKeyCriadoPorGUID,
      ApiKeyUltimoUsoEm: row.ApiKeyUltimoUsoEm,
      ApiKeyCreatedAt: row.ApiKeyCreatedAt,
      ApiKeyUpdatedAt: row.ApiKeyUpdatedAt,
    });
  }
}
