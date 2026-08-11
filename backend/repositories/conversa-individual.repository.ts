import ConversaIndividual from '../entities/conversa-individual.model';
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket } from 'mysql2';

interface ConversaIndividualRow extends RowDataPacket {
  ConversaGUID: string;
  ConversaIndUsr1GUID: string;
  ConversaIndUsr2GUID: string;
}

interface ParceiroRow extends RowDataPacket {
  ParceiroGUID: string;
  ParceiroNome: string;
}

export class ConversaIndividualDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log('⬆️  ConversaIndividualDAO.constructor()');
    this.#database = database;
  }

  // guid1 e guid2 já devem estar normalizados (menor → Usr1, maior → Usr2)
  async create(conversaGUID: string, guid1: string, guid2: string): Promise<void> {
    console.log('🟢 ConversaIndividualDAO.create()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `INSERT INTO conversa_individual (ConversaGUID, ConversaIndUsr1GUID, ConversaIndUsr2GUID)
       VALUES (?, ?, ?)`,
      [conversaGUID, guid1, guid2]
    );
  }

  // Busca pelo par canônico — service normaliza antes de chamar
  async findByPair(guid1: string, guid2: string): Promise<ConversaIndividual | null> {
    console.log('🟢 ConversaIndividualDAO.findByPair()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT ci.*
       FROM conversa_individual ci
       INNER JOIN conversa c ON c.ConversaGUID = ci.ConversaGUID
       WHERE ci.ConversaIndUsr1GUID = ?
         AND ci.ConversaIndUsr2GUID = ?
         AND c.ConversaStatus = 'Ativa'
       LIMIT 1`,
      [guid1, guid2]
    );
    const list = rows as ConversaIndividualRow[];
    if (list.length === 0) return null;
    return ConversaIndividual.fromDatabase(list[0]);
  }

  async isMembro(conversaGUID: string, usuarioGUID: string): Promise<boolean> {
    console.log('🟢 ConversaIndividualDAO.isMembro()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT 1 FROM conversa_individual
       WHERE ConversaGUID = ?
         AND (ConversaIndUsr1GUID = ? OR ConversaIndUsr2GUID = ?)
       LIMIT 1`,
      [conversaGUID, usuarioGUID, usuarioGUID]
    );
    return (rows as RowDataPacket[]).length > 0;
  }

  // Retorna GUID + nome do outro participante
  async getParceiroInfo(
    conversaGUID: string,
    meuGUID: string
  ): Promise<{ ParceiroGUID: string; ParceiroNome: string } | null> {
    console.log('🟢 ConversaIndividualDAO.getParceiroInfo()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT
         u.UsuarioGUID AS ParceiroGUID,
         u.UsuarioNome AS ParceiroNome
       FROM conversa_individual ci
       INNER JOIN usuario u ON u.UsuarioGUID = CASE
         WHEN ci.ConversaIndUsr1GUID = ? THEN ci.ConversaIndUsr2GUID
         ELSE ci.ConversaIndUsr1GUID
       END
       WHERE ci.ConversaGUID = ?
       LIMIT 1`,
      [meuGUID, conversaGUID]
    );
    const list = rows as ParceiroRow[];
    if (list.length === 0) return null;
    return { ParceiroGUID: list[0].ParceiroGUID, ParceiroNome: list[0].ParceiroNome };
  }
}
