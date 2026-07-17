import ConversaIndividual from '../entities/conversa-individual.model';
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket } from 'mysql2';

interface ConversaIndividualRow extends RowDataPacket {
  ConversaGUID: string;
  ConversaIndUsr1CPF: string;
  ConversaIndUsr2CPF: string;
}

interface ParceiroRow extends RowDataPacket {
  ParceiroCPF: string;
  ParceiroNome: string;
}

export class ConversaIndividualDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log('⬆️  ConversaIndividualDAO.constructor()');
    this.#database = database;
  }

  // cpf1 e cpf2 já devem estar normalizados (menor → Usr1, maior → Usr2)
  async create(conversaGUID: string, cpf1: string, cpf2: string): Promise<void> {
    console.log('🟢 ConversaIndividualDAO.create()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `INSERT INTO conversa_individual (ConversaGUID, ConversaIndUsr1CPF, ConversaIndUsr2CPF)
       VALUES (?, ?, ?)`,
      [conversaGUID, cpf1, cpf2]
    );
  }

  // Busca pelo par canônico — service normaliza antes de chamar
  async findByPair(cpf1: string, cpf2: string): Promise<ConversaIndividual | null> {
    console.log('🟢 ConversaIndividualDAO.findByPair()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT ci.*
       FROM conversa_individual ci
       INNER JOIN conversa c ON c.ConversaGUID = ci.ConversaGUID
       WHERE ci.ConversaIndUsr1CPF = ?
         AND ci.ConversaIndUsr2CPF = ?
         AND c.ConversaStatus = 'Ativa'
       LIMIT 1`,
      [cpf1, cpf2]
    );
    const list = rows as ConversaIndividualRow[];
    if (list.length === 0) return null;
    return ConversaIndividual.fromDatabase(list[0]);
  }

  async isMembro(conversaGUID: string, usuarioCPF: string): Promise<boolean> {
    console.log('🟢 ConversaIndividualDAO.isMembro()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT 1 FROM conversa_individual
       WHERE ConversaGUID = ?
         AND (ConversaIndUsr1CPF = ? OR ConversaIndUsr2CPF = ?)
       LIMIT 1`,
      [conversaGUID, usuarioCPF, usuarioCPF]
    );
    return (rows as RowDataPacket[]).length > 0;
  }

  // Retorna CPF + nome do outro participante
  async getParceiroInfo(
    conversaGUID: string,
    meuCPF: string
  ): Promise<{ ParceiroCPF: string; ParceiroNome: string } | null> {
    console.log('🟢 ConversaIndividualDAO.getParceiroInfo()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT
         u.UsuarioCPF AS ParceiroCPF,
         u.UsuarioNome AS ParceiroNome
       FROM conversa_individual ci
       INNER JOIN usuario u ON u.UsuarioCPF = CASE
         WHEN ci.ConversaIndUsr1CPF = ? THEN ci.ConversaIndUsr2CPF
         ELSE ci.ConversaIndUsr1CPF
       END
       WHERE ci.ConversaGUID = ?
       LIMIT 1`,
      [meuCPF, conversaGUID]
    );
    const list = rows as ParceiroRow[];
    if (list.length === 0) return null;
    return { ParceiroCPF: list[0].ParceiroCPF, ParceiroNome: list[0].ParceiroNome };
  }
}
