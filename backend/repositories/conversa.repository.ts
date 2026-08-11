import Conversa from '../entities/conversa.model';
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket } from 'mysql2';

interface ConversaRow extends RowDataPacket {
  ConversaGUID: string;
  ConversaTipo: 'Individual' | 'Grupo';
  ConversaStatus: 'Ativa' | 'Inativa';
  ConversaCreatedAt: Date;
  ConversaUpdatedAt: Date;
}

export class ConversaDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log('⬆️  ConversaDAO.constructor()');
    this.#database = database;
  }

  async create(guid: string, tipo: 'Individual' | 'Grupo'): Promise<void> {
    console.log('🟢 ConversaDAO.create()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `INSERT INTO conversa (ConversaGUID, ConversaTipo, ConversaStatus) VALUES (?, ?, 'Ativa')`,
      [guid, tipo]
    );
  }

  async findById(conversaGUID: string): Promise<Conversa | null> {
    console.log('🟢 ConversaDAO.findById()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM conversa WHERE ConversaGUID = ? LIMIT 1`,
      [conversaGUID]
    );
    const list = rows as ConversaRow[];
    if (list.length === 0) return null;
    return this.#mapRow(list[0]);
  }

  async findAllByUsuarioGUID(usuarioGUID: string): Promise<Conversa[]> {
    console.log('🟢 ConversaDAO.findAllByUsuarioGUID()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT c.* FROM conversa c
       INNER JOIN conversa_grupo_membro cgm ON cgm.ConversaGUID = c.ConversaGUID
       WHERE cgm.MembroUsuarioGUID = ?
         AND cgm.MembroStatus = 'Ativo'
         AND c.ConversaStatus = 'Ativa'
       UNION
       SELECT c.* FROM conversa c
       INNER JOIN conversa_individual ci ON ci.ConversaGUID = c.ConversaGUID
       WHERE (ci.ConversaIndUsr1GUID = ? OR ci.ConversaIndUsr2GUID = ?)
         AND c.ConversaStatus = 'Ativa'
       ORDER BY ConversaUpdatedAt DESC`,
      [usuarioGUID, usuarioGUID, usuarioGUID]
    );
    return (rows as ConversaRow[]).map((r) => this.#mapRow(r));
  }

  // Verificação unificada de participação — cobre grupos e conversas individuais
  async isParticipante(conversaGUID: string, usuarioGUID: string): Promise<boolean> {
    console.log('🟢 ConversaDAO.isParticipante()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT 1 FROM conversa c
       WHERE c.ConversaGUID = ?
         AND c.ConversaStatus = 'Ativa'
         AND (
           (c.ConversaTipo = 'Grupo' AND EXISTS (
             SELECT 1 FROM conversa_grupo_membro cgm
             WHERE cgm.ConversaGUID = c.ConversaGUID
               AND cgm.MembroUsuarioGUID = ?
               AND cgm.MembroStatus = 'Ativo'
           ))
           OR
           (c.ConversaTipo = 'Individual' AND EXISTS (
             SELECT 1 FROM conversa_individual ci
             WHERE ci.ConversaGUID = c.ConversaGUID
               AND (ci.ConversaIndUsr1GUID = ? OR ci.ConversaIndUsr2GUID = ?)
           ))
         )
       LIMIT 1`,
      [conversaGUID, usuarioGUID, usuarioGUID, usuarioGUID]
    );
    return (rows as RowDataPacket[]).length > 0;
  }

  async setStatus(conversaGUID: string, status: 'Ativa' | 'Inativa'): Promise<void> {
    console.log('🟢 ConversaDAO.setStatus()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE conversa SET ConversaStatus = ? WHERE ConversaGUID = ?`,
      [status, conversaGUID]
    );
  }

  #mapRow(row: ConversaRow): Conversa {
    return Conversa.fromDatabase(row);
  }
}
