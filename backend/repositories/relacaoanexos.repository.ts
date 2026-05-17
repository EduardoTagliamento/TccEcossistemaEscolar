/**
 * 🟢 Repository - RelacaoAnexos
 * 
 * Camada de acesso a dados para vínculos entre anexos e recursos (tarefa/pendência/evento).
 * 
 * Métodos:
 * - vincularAnexoTarefa: Vincular anexo a tarefa
 * - vincularAnexoPendencia: Vincular anexo a pendência
 * - vincularAnexoEvento: Vincular anexo a evento
 * - findAnexosByTarefa: Buscar anexos de uma tarefa
 * - findAnexosByPendencia: Buscar anexos de uma pendência
 * - findAnexosByEvento: Buscar anexos de um evento
 * - delete: Remover vínculo
 */

import MysqlDatabase from "../database/MysqlDatabase";
import { RelacaoAnexos } from "../entities/relacaoanexos.model";
import Anexo from "../entities/anexo.model";
import { ResultSetHeader, RowDataPacket } from "mysql2";

/**
 * DAO de RelacaoAnexos
 */
export class RelacaoAnexosDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log("🟢 RelacaoAnexosDAO.constructor()");
    this.#database = database;
  }

  /**
   * Vincular anexo a tarefa acadêmica
   */
  async vincularAnexoTarefa(anexoGUID: string, tarefaGUID: string): Promise<RelacaoAnexos> {
    console.log("🟢 RelacaoAnexosDAO.vincularAnexoTarefa()");

    const { v4: uuidv4 } = await import("uuid");
    const relacaoGUID = uuidv4();

    const query = `
      INSERT INTO relacaoanexos (
        RelacaoAnexoGUID,
        AnexoGUID,
        TarefaGUID,
        PendenciaGUID,
        EventoGUID
      ) VALUES (?, ?, ?, NULL, NULL)
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [relacaoGUID, anexoGUID, tarefaGUID]);

    return {
      RelacaoAnexoGUID: relacaoGUID,
      AnexoGUID: anexoGUID,
      TarefaGUID: tarefaGUID,
      PendenciaGUID: null,
      EventoGUID: null,
      RelacaoCreatedAt: new Date()
    };
  }

  /**
   * Vincular anexo a pendência
   */
  async vincularAnexoPendencia(anexoGUID: string, pendenciaGUID: string): Promise<RelacaoAnexos> {
    console.log("🟢 RelacaoAnexosDAO.vincularAnexoPendencia()");

    const { v4: uuidv4 } = await import("uuid");
    const relacaoGUID = uuidv4();

    const query = `
      INSERT INTO relacaoanexos (
        RelacaoAnexoGUID,
        AnexoGUID,
        TarefaGUID,
        PendenciaGUID,
        EventoGUID
      ) VALUES (?, ?, NULL, ?, NULL)
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [relacaoGUID, anexoGUID, pendenciaGUID]);

    return {
      RelacaoAnexoGUID: relacaoGUID,
      AnexoGUID: anexoGUID,
      TarefaGUID: null,
      PendenciaGUID: pendenciaGUID,
      EventoGUID: null,
      RelacaoCreatedAt: new Date()
    };
  }

  /**
   * Vincular anexo a evento
   */
  async vincularAnexoEvento(anexoGUID: string, eventoGUID: string): Promise<RelacaoAnexos> {
    console.log("🟢 RelacaoAnexosDAO.vincularAnexoEvento()");

    const { v4: uuidv4 } = await import("uuid");
    const relacaoGUID = uuidv4();

    const query = `
      INSERT INTO relacaoanexos (
        RelacaoAnexoGUID,
        AnexoGUID,
        TarefaGUID,
        PendenciaGUID,
        EventoGUID
      ) VALUES (?, ?, NULL, NULL, ?)
    `;

    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(query, [relacaoGUID, anexoGUID, eventoGUID]);

    return {
      RelacaoAnexoGUID: relacaoGUID,
      AnexoGUID: anexoGUID,
      TarefaGUID: null,
      PendenciaGUID: null,
      EventoGUID: eventoGUID,
      RelacaoCreatedAt: new Date()
    };
  }

  /**
   * Buscar anexos de uma tarefa acadêmica
   */
  async findAnexosByTarefa(tarefaGUID: string): Promise<Anexo[]> {
    console.log("🟢 RelacaoAnexosDAO.findAnexosByTarefa()");

    const query = `
      SELECT
        a.AnexoGUID,
        a.UsuarioCPF,
        a.EscolaGUID,
        a.AnexoCaminho,
        a.AnexoNomeOriginal,
        a.AnexoTamanho,
        a.AnexoTipo,
        a.AnexoCreatedAt
      FROM anexo a
      JOIN relacaoanexos ra ON ra.AnexoGUID = a.AnexoGUID
      WHERE ra.TarefaGUID = ?
      ORDER BY a.AnexoCreatedAt ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [tarefaGUID]);

    return (rows as any[]).map((row: any) => this.#mapRowToAnexo(row));
  }

  /**
   * Buscar anexos de uma pendência
   */
  async findAnexosByPendencia(pendenciaGUID: string): Promise<Anexo[]> {
    console.log("🟢 RelacaoAnexosDAO.findAnexosByPendencia()");

    const query = `
      SELECT
        a.AnexoGUID,
        a.UsuarioCPF,
        a.EscolaGUID,
        a.AnexoCaminho,
        a.AnexoNomeOriginal,
        a.AnexoTamanho,
        a.AnexoTipo,
        a.AnexoCreatedAt
      FROM anexo a
      JOIN relacaoanexos ra ON ra.AnexoGUID = a.AnexoGUID
      WHERE ra.PendenciaGUID = ?
      ORDER BY a.AnexoCreatedAt ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [pendenciaGUID]);

    return (rows as any[]).map((row: any) => this.#mapRowToAnexo(row));
  }

  /**
   * Buscar anexos de um evento
   */
  async findAnexosByEvento(eventoGUID: string): Promise<Anexo[]> {
    console.log("🟢 RelacaoAnexosDAO.findAnexosByEvento()");

    const query = `
      SELECT
        a.AnexoGUID,
        a.UsuarioCPF,
        a.EscolaGUID,
        a.AnexoCaminho,
        a.AnexoNomeOriginal,
        a.AnexoTamanho,
        a.AnexoTipo,
        a.AnexoCreatedAt
      FROM anexo a
      JOIN relacaoanexos ra ON ra.AnexoGUID = a.AnexoGUID
      WHERE ra.EventoGUID = ?
      ORDER BY a.AnexoCreatedAt ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [eventoGUID]);

    return (rows as any[]).map((row: any) => this.#mapRowToAnexo(row));
  }

  /**
   * Remover vínculo entre anexo e recurso
   */
  async delete(relacaoGUID: string): Promise<boolean> {
    console.log("🟢 RelacaoAnexosDAO.delete()");

    const query = `
      DELETE FROM relacaoanexos
      WHERE RelacaoAnexoGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(query, [relacaoGUID]);

    return result.affectedRows > 0;
  }

  /**
   * Buscar vínculo por anexo e tarefa
   */
  async findByAnexoAndTarefa(anexoGUID: string, tarefaGUID: string): Promise<RelacaoAnexos | null> {
    console.log("🟢 RelacaoAnexosDAO.findByAnexoAndTarefa()");

    const query = `
      SELECT
        RelacaoAnexoGUID,
        AnexoGUID,
        TarefaGUID,
        PendenciaGUID,
        EventoGUID,
        RelacaoCreatedAt
      FROM relacaoanexos
      WHERE AnexoGUID = ? AND TarefaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [anexoGUID, tarefaGUID]);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      RelacaoAnexoGUID: row.RelacaoAnexoGUID,
      AnexoGUID: row.AnexoGUID,
      TarefaGUID: row.TarefaGUID,
      PendenciaGUID: row.PendenciaGUID,
      EventoGUID: row.EventoGUID,
      RelacaoCreatedAt: row.RelacaoCreatedAt
    };
  }

  /**
   * Mapper: Row SQL → Entidade Anexo
   */
  #mapRowToAnexo(row: any): Anexo {
    const anexo = new Anexo();
    anexo.AnexoGUID = row.AnexoGUID;
    anexo.UsuarioCPF = row.UsuarioCPF;
    anexo.EscolaGUID = row.EscolaGUID;
    anexo.AnexoCaminho = row.AnexoCaminho;
    anexo.AnexoNomeOriginal = row.AnexoNomeOriginal;
    anexo.AnexoTamanho = row.AnexoTamanho;
    anexo.CreatedAt = row.AnexoCreatedAt || row.CreatedAt;
    return anexo;
  }
}
