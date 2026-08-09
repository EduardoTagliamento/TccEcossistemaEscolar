import MysqlDatabase from '../database/MysqlDatabase';
import { Sugestao, SugestaoComAutor } from '../entities/sugestao.model';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export class SugestaoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log('🟢 SugestaoDAO.constructor()');
    this.#database = databaseInstance;
  }

  async create(sugestao: Sugestao): Promise<Sugestao> {
    console.log('🟢 SugestaoDAO.create()');
    const pool = await this.#database.getPool();
    await pool.execute<ResultSetHeader>(
      `INSERT INTO sugestao (SugestaoGUID, UsuarioCPF, EscolaGUID, SugestaoTexto, SugestaoPaginaUrl)
       VALUES (?, ?, ?, ?, ?)`,
      [sugestao.SugestaoGUID, sugestao.UsuarioCPF, sugestao.EscolaGUID, sugestao.SugestaoTexto, sugestao.SugestaoPaginaUrl]
    );
    return sugestao;
  }

  // Listagem pra admin — já traz nome/e-mail de quem enviou.
  async findAllComAutor(): Promise<SugestaoComAutor[]> {
    console.log('🟢 SugestaoDAO.findAllComAutor()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, u.UsuarioNome, u.UsuarioEmail
       FROM sugestao s
       JOIN usuario u ON u.UsuarioCPF = s.UsuarioCPF
       ORDER BY s.SugestaoCreatedAt DESC`
    );
    return rows as SugestaoComAutor[];
  }

  async delete(guid: string): Promise<boolean> {
    console.log('🟢 SugestaoDAO.delete()');
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>('DELETE FROM sugestao WHERE SugestaoGUID = ?', [guid]);
    return result.affectedRows > 0;
  }
}
