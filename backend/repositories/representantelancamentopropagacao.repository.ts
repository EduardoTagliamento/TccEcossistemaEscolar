import RepresentanteLancamentoPropagacao from "../entities/representantelancamentopropagacao.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket } from "mysql2";

interface PropagacaoRow extends RowDataPacket {
  PropagacaoGUID: string;
  TipoOrigem: 'Prova' | 'Tarefa' | 'Conteudo';
  OrigemGUID: string;
  TurmaOrigemGUID: string;
  TurmaDestinoGUID: string;
  RepresentanteDestinoUsuarioGUID: string | null;
  Status: 'Pendente' | 'Confirmado' | 'RecusadoComEdicao';
  ConteudoEditado: string | null;
  EntidadeResultanteGUID: string | null;
  CreatedAt: Date;
  RespondidoEm: Date | null;
}

/**
 * Repository (DAO) para o fan-out de propagação de Prova/Tarefa/Conteúdo
 * criados por Representante em nome do professor (ver
 * backend/entities/representantelancamentopropagacao.model.ts).
 */
export class RepresentanteLancamentoPropagacaoDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    this.#database = database;
  }

  async create(p: RepresentanteLancamentoPropagacao): Promise<RepresentanteLancamentoPropagacao> {
    const query = `
      INSERT INTO representantelancamentopropagacao (
        PropagacaoGUID, TipoOrigem, OrigemGUID, TurmaOrigemGUID, TurmaDestinoGUID,
        RepresentanteDestinoUsuarioGUID, Status, ConteudoEditado, EntidadeResultanteGUID,
        CreatedAt, RespondidoEm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      p.PropagacaoGUID,
      p.TipoOrigem,
      p.OrigemGUID,
      p.TurmaOrigemGUID,
      p.TurmaDestinoGUID,
      p.RepresentanteDestinoUsuarioGUID,
      p.Status,
      p.ConteudoEditado,
      p.EntidadeResultanteGUID,
      p.CreatedAt,
      p.RespondidoEm,
    ];
    const pool = await this.#database.getPool();
    await pool.execute(query, params);
    return p;
  }

  async findById(propagacaoGUID: string): Promise<RepresentanteLancamentoPropagacao | null> {
    const query = `SELECT * FROM representantelancamentopropagacao WHERE PropagacaoGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<PropagacaoRow[]>(query, [propagacaoGUID]);
    if (!rows || rows.length === 0) return null;
    return RepresentanteLancamentoPropagacao.fromDatabase(rows[0]);
  }

  /** Propagações Pendentes endereçadas a um representante específico, numa turma específica. */
  async findPendentesPorTurmaERepresentante(
    turmaDestinoGUID: string
  ): Promise<RepresentanteLancamentoPropagacao[]> {
    const query = `
      SELECT * FROM representantelancamentopropagacao
      WHERE TurmaDestinoGUID = ? AND Status = 'Pendente'
      ORDER BY CreatedAt ASC
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<PropagacaoRow[]>(query, [turmaDestinoGUID]);
    return rows.map((row) => RepresentanteLancamentoPropagacao.fromDatabase(row));
  }

  async marcarConfirmado(propagacaoGUID: string, representanteGUID: string, entidadeResultanteGUID: string): Promise<void> {
    const query = `
      UPDATE representantelancamentopropagacao
      SET Status = 'Confirmado', RepresentanteDestinoUsuarioGUID = ?, EntidadeResultanteGUID = ?, RespondidoEm = ?
      WHERE PropagacaoGUID = ?
    `;
    const pool = await this.#database.getPool();
    await pool.execute(query, [representanteGUID, entidadeResultanteGUID, new Date(), propagacaoGUID]);
  }

  async marcarRecusadoComEdicao(
    propagacaoGUID: string,
    representanteGUID: string,
    conteudoEditado: string,
    entidadeResultanteGUID: string
  ): Promise<void> {
    const query = `
      UPDATE representantelancamentopropagacao
      SET Status = 'RecusadoComEdicao', RepresentanteDestinoUsuarioGUID = ?, ConteudoEditado = ?,
          EntidadeResultanteGUID = ?, RespondidoEm = ?
      WHERE PropagacaoGUID = ?
    `;
    const pool = await this.#database.getPool();
    await pool.execute(query, [representanteGUID, conteudoEditado, entidadeResultanteGUID, new Date(), propagacaoGUID]);
  }
}
