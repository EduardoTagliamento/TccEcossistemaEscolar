/**
 * 🟢 Repository - RelacaoAnexos
 *
 * Camada de acesso a dados para vínculos entre anexos e recursos (tarefa/pendência/evento).
 *
 * Não existe uma tabela `relacaoanexos` unificada: cada recurso tem sua própria
 * tabela de vínculo, já existente em produção (`relacaoanexostarefa`,
 * `relacaoanexospendencia`, `relacaoanexosevento`), com PK e colunas próprias.
 * Este DAO normaliza esse acesso na forma da entidade RelacaoAnexos.
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
   * Vincular anexo a tarefa acadêmica (material de apoio → AnexoTipo 'descricao')
   */
  async vincularAnexoTarefa(anexoGUID: string, tarefaGUID: string): Promise<RelacaoAnexos> {
    console.log("🟢 RelacaoAnexosDAO.vincularAnexoTarefa()");

    const { v4: uuidv4 } = await import("uuid");
    const relacaoGUID = uuidv4();

    const query = `
      INSERT INTO relacaoanexostarefa (
        RelacaoAnexoTarefaGUID,
        AnexoGUID,
        TarefaGUID,
        AnexoTipo
      ) VALUES (?, ?, ?, 'descricao')
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
   * Vincular anexo a pendência (resposta do destinatário → AnexoTipo 'entrega')
   */
  async vincularAnexoPendencia(anexoGUID: string, pendenciaGUID: string): Promise<RelacaoAnexos> {
    console.log("🟢 RelacaoAnexosDAO.vincularAnexoPendencia()");

    const { v4: uuidv4 } = await import("uuid");
    const relacaoGUID = uuidv4();

    const query = `
      INSERT INTO relacaoanexospendencia (
        RelacaoAnexoPendenciaGUID,
        AnexoGUID,
        PendenciaGUID,
        AnexoTipo
      ) VALUES (?, ?, ?, 'entrega')
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
   * Vincular anexo a evento (unidirecional, sem AnexoTipo)
   */
  async vincularAnexoEvento(anexoGUID: string, eventoGUID: string): Promise<RelacaoAnexos> {
    console.log("🟢 RelacaoAnexosDAO.vincularAnexoEvento()");

    const { v4: uuidv4 } = await import("uuid");
    const relacaoGUID = uuidv4();

    const query = `
      INSERT INTO relacaoanexosevento (
        RelacaoAnexoEventoGUID,
        AnexoGUID,
        EventoGUID
      ) VALUES (?, ?, ?)
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
        a.CreatedAt
      FROM anexo a
      JOIN relacaoanexostarefa ra ON ra.AnexoGUID = a.AnexoGUID
      WHERE ra.TarefaGUID = ?
      ORDER BY a.CreatedAt ASC
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
        a.CreatedAt
      FROM anexo a
      JOIN relacaoanexospendencia ra ON ra.AnexoGUID = a.AnexoGUID
      WHERE ra.PendenciaGUID = ?
      ORDER BY a.CreatedAt ASC
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
        a.CreatedAt
      FROM anexo a
      JOIN relacaoanexosevento ra ON ra.AnexoGUID = a.AnexoGUID
      WHERE ra.EventoGUID = ?
      ORDER BY a.CreatedAt ASC
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [eventoGUID]);

    return (rows as any[]).map((row: any) => this.#mapRowToAnexo(row));
  }

  /**
   * Remover vínculo entre anexo e recurso.
   * O GUID de vínculo é único globalmente (uuidv4), mas pode estar em
   * qualquer uma das 3 tabelas de recurso — tenta nas três.
   */
  async delete(relacaoGUID: string): Promise<boolean> {
    console.log("🟢 RelacaoAnexosDAO.delete()");

    const pool = await this.#database.getPool();

    const [resultTarefa] = await pool.execute<ResultSetHeader>(
      "DELETE FROM relacaoanexostarefa WHERE RelacaoAnexoTarefaGUID = ?",
      [relacaoGUID]
    );
    if (resultTarefa.affectedRows > 0) {
      return true;
    }

    const [resultPendencia] = await pool.execute<ResultSetHeader>(
      "DELETE FROM relacaoanexospendencia WHERE RelacaoAnexoPendenciaGUID = ?",
      [relacaoGUID]
    );
    if (resultPendencia.affectedRows > 0) {
      return true;
    }

    const [resultEvento] = await pool.execute<ResultSetHeader>(
      "DELETE FROM relacaoanexosevento WHERE RelacaoAnexoEventoGUID = ?",
      [relacaoGUID]
    );

    return resultEvento.affectedRows > 0;
  }

  /**
   * Buscar vínculo por anexo e tarefa
   */
  async findByAnexoAndTarefa(anexoGUID: string, tarefaGUID: string): Promise<RelacaoAnexos | null> {
    console.log("🟢 RelacaoAnexosDAO.findByAnexoAndTarefa()");

    const query = `
      SELECT
        RelacaoAnexoTarefaGUID,
        AnexoGUID,
        TarefaGUID,
        CreatedAt
      FROM relacaoanexostarefa
      WHERE AnexoGUID = ? AND TarefaGUID = ?
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(query, [anexoGUID, tarefaGUID]);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      RelacaoAnexoGUID: row.RelacaoAnexoTarefaGUID,
      AnexoGUID: row.AnexoGUID,
      TarefaGUID: row.TarefaGUID,
      PendenciaGUID: null,
      EventoGUID: null,
      RelacaoCreatedAt: row.CreatedAt
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
    anexo.CreatedAt = row.CreatedAt;
    return anexo;
  }
}
