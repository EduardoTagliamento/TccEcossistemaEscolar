/**
 * 📵 Repository (DAO) - WhatsappFilaReenvio
 *
 * Fila de reenvio pra mensagens de WhatsApp que falharam mesmo depois do
 * retry embutido do EvolutionApiService — ver whatsapp-fila.scheduler.ts.
 */

import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

export type WhatsappFilaStatus = "Pendente" | "Enviado" | "Desistido";

export interface WhatsappFilaRow {
  WhatsappFilaId: number;
  WhatsappFilaNumero: string;
  WhatsappFilaTexto: string;
  WhatsappFilaOrigem: string | null;
  WhatsappFilaStatus: WhatsappFilaStatus;
  WhatsappFilaTentativas: number;
  WhatsappFilaUltimoErro: string | null;
  WhatsappFilaUltimaTentativaEm: Date | null;
  WhatsappFilaEnviadoEm: Date | null;
  CreatedAt: Date;
}

export class WhatsappFilaReenvioDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 WhatsappFilaReenvioDAO.constructor()");
    this.#database = database;
  }

  async enfileirar(numero: string, texto: string, origem: string | null, erro: string | null): Promise<void> {
    console.log("🟢 WhatsappFilaReenvioDAO.enfileirar()");

    const query = `
      INSERT INTO whatsappfilareenvio (WhatsappFilaNumero, WhatsappFilaTexto, WhatsappFilaOrigem, WhatsappFilaUltimoErro)
      VALUES (?, ?, ?, ?)
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [numero, texto, origem, erro?.substring(0, 255) ?? null]);
  }

  async buscarPendentes(limite: number): Promise<WhatsappFilaRow[]> {
    console.log("🟢 WhatsappFilaReenvioDAO.buscarPendentes()");

    // `LIMIT ?` bindado quebra em pool.execute() (prepared statement) com
    // "ER_WRONG_ARGUMENTS / Incorrect arguments to mysqld_stmt_execute" — bug
    // conhecido do mysql2. Como `limite` é sempre valor interno do código (nunca
    // input de usuário), valida e interpola como inteiro literal — mesmo padrão
    // de UsuarioDAO.searchByNome.
    const limiteSeguro = Number.isInteger(limite) && limite > 0 ? limite : 10;

    const query = `
      SELECT WhatsappFilaId, WhatsappFilaNumero, WhatsappFilaTexto, WhatsappFilaOrigem,
        WhatsappFilaStatus, WhatsappFilaTentativas, WhatsappFilaUltimoErro,
        WhatsappFilaUltimaTentativaEm, WhatsappFilaEnviadoEm, CreatedAt
      FROM whatsappfilareenvio
      WHERE WhatsappFilaStatus = 'Pendente'
      ORDER BY CreatedAt ASC
      LIMIT ${limiteSeguro}
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query);

    return rows as unknown as WhatsappFilaRow[];
  }

  async marcarEnviado(id: number): Promise<void> {
    console.log("🟢 WhatsappFilaReenvioDAO.marcarEnviado()");

    const query = `
      UPDATE whatsappfilareenvio
      SET WhatsappFilaStatus = 'Enviado',
          WhatsappFilaEnviadoEm = NOW(),
          WhatsappFilaTentativas = WhatsappFilaTentativas + 1,
          WhatsappFilaUltimaTentativaEm = NOW()
      WHERE WhatsappFilaId = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [id]);
  }

  async marcarTentativaFalhou(id: number, erro: string): Promise<void> {
    console.log("🟢 WhatsappFilaReenvioDAO.marcarTentativaFalhou()");

    const query = `
      UPDATE whatsappfilareenvio
      SET WhatsappFilaTentativas = WhatsappFilaTentativas + 1,
          WhatsappFilaUltimoErro = ?,
          WhatsappFilaUltimaTentativaEm = NOW()
      WHERE WhatsappFilaId = ?
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [erro.substring(0, 255), id]);
  }

  async marcarDesistido(id: number): Promise<void> {
    console.log("🟢 WhatsappFilaReenvioDAO.marcarDesistido()");

    const query = `UPDATE whatsappfilareenvio SET WhatsappFilaStatus = 'Desistido' WHERE WhatsappFilaId = ?`;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [id]);
  }
}
