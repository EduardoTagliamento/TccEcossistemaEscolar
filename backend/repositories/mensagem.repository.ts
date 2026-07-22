import Mensagem from '../entities/mensagem.model';
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket } from 'mysql2';

interface MensagemRow extends RowDataPacket {
  MensagemGUID: string;
  ConversaGUID: string;
  MensagemRemetenteCPF: string;
  MensagemConteudo: string;
  MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
  MensagemCreatedAt: Date;
  MensagemDeletedAt: Date | null;
  MensagemEditadaAt: Date | null;
}

interface UltimaMensagemRow extends MensagemRow {
  RemetenteNome: string;
}

export interface MensagemFixadaRow extends RowDataPacket {
  MensagemGUID: string;
  ConversaGUID: string;
  FixadaPorCPF: string;
  FixadaAt: Date;
  MensagemConteudo: string;
  MensagemRemetenteCPF: string;
  MensagemCreatedAt: Date;
  MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
}

export class MensagemDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log('⬆️  MensagemDAO.constructor()');
    this.#database = database;
  }

  async findById(mensagemGUID: string): Promise<Mensagem | null> {
    console.log('🟢 MensagemDAO.findById()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM mensagem WHERE MensagemGUID = ? LIMIT 1`,
      [mensagemGUID]
    );
    const list = rows as MensagemRow[];
    if (list.length === 0) return null;
    return Mensagem.fromDatabase(list[0]);
  }

  async create(mensagem: Mensagem): Promise<Mensagem> {
    console.log('🟢 MensagemDAO.create()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `INSERT INTO mensagem
         (MensagemGUID, ConversaGUID, MensagemRemetenteCPF, MensagemConteudo, MensagemTipo, MensagemCreatedAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        mensagem.MensagemGUID,
        mensagem.ConversaGUID,
        mensagem.MensagemRemetenteCPF,
        mensagem.MensagemConteudo,
        mensagem.MensagemTipo,
        mensagem.MensagemCreatedAt,
      ]
    );
    return mensagem;
  }

  // Cursor-based pagination: retorna até `limit` mensagens anteriores a `beforeGUID`
  async findByConversa(
    conversaGUID: string,
    limit: number = 30,
    beforeGUID?: string
  ): Promise<Mensagem[]> {
    console.log('🟢 MensagemDAO.findByConversa()');
    const pool = await this.#database.getPool();
    const params: any[] = [conversaGUID];
    let cursorClause = '';

    if (beforeGUID) {
      const [cursorRows] = await pool.execute(
        `SELECT MensagemCreatedAt FROM mensagem WHERE MensagemGUID = ? LIMIT 1`,
        [beforeGUID]
      );
      const cursor = (cursorRows as RowDataPacket[])[0];
      if (cursor) {
        cursorClause = ` AND MensagemCreatedAt < ?`;
        params.push(cursor.MensagemCreatedAt);
      }
    }

    // LIMIT inlinado diretamente (não vinculado via `?`) — pool.execute()
    // (prepared statement do mysql2) falha com "Incorrect arguments to
    // mysqld_stmt_execute" ao vincular LIMIT como parâmetro. `limit` já é
    // `number` (parâmetro tipado da função), sem risco de injeção.
    const [rows] = await pool.execute(
      `SELECT * FROM mensagem
       WHERE ConversaGUID = ?
         AND MensagemDeletedAt IS NULL
         ${cursorClause}
       ORDER BY MensagemCreatedAt DESC
       LIMIT ${Math.trunc(Number(limit)) || 30}`,
      params
    );
    // Retorna em ordem cronológica (mais antigas primeiro)
    return (rows as MensagemRow[]).map((r) => Mensagem.fromDatabase(r)).reverse();
  }

  async findUltimaMensagem(conversaGUID: string): Promise<{
    MensagemConteudo: string;
    MensagemRemetenteCPF: string;
    RemetenteNome: string;
    MensagemCreatedAt: string;
    MensagemTipo: 'Texto' | 'Arquivo' | 'Imagem';
  } | null> {
    console.log('🟢 MensagemDAO.findUltimaMensagem()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT m.MensagemConteudo, m.MensagemRemetenteCPF, m.MensagemCreatedAt, m.MensagemTipo, u.UsuarioNome AS RemetenteNome
       FROM mensagem m
       INNER JOIN usuario u ON u.UsuarioCPF = m.MensagemRemetenteCPF
       WHERE m.ConversaGUID = ? AND m.MensagemDeletedAt IS NULL
       ORDER BY m.MensagemCreatedAt DESC
       LIMIT 1`,
      [conversaGUID]
    );
    const list = rows as UltimaMensagemRow[];
    if (list.length === 0) return null;
    const r = list[0];
    return {
      MensagemConteudo: r.MensagemConteudo,
      MensagemRemetenteCPF: r.MensagemRemetenteCPF,
      RemetenteNome: r.RemetenteNome,
      MensagemCreatedAt: (r.MensagemCreatedAt as Date).toISOString(),
      MensagemTipo: r.MensagemTipo,
    };
  }

  async markAsRead(mensagemGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟢 MensagemDAO.markAsRead()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `INSERT IGNORE INTO mensagem_leitura (MensagemGUID, UsuarioCPF) VALUES (?, ?)`,
      [mensagemGUID, usuarioCPF]
    );
  }

  async markAllAsRead(conversaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟢 MensagemDAO.markAllAsRead()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `INSERT IGNORE INTO mensagem_leitura (MensagemGUID, UsuarioCPF)
       SELECT m.MensagemGUID, ?
       FROM mensagem m
       LEFT JOIN mensagem_leitura ml ON ml.MensagemGUID = m.MensagemGUID AND ml.UsuarioCPF = ?
       WHERE m.ConversaGUID = ?
         AND m.MensagemDeletedAt IS NULL
         AND ml.MensagemGUID IS NULL`,
      [usuarioCPF, usuarioCPF, conversaGUID]
    );
  }

  async countNaoLidas(conversaGUID: string, usuarioCPF: string): Promise<number> {
    console.log('🟢 MensagemDAO.countNaoLidas()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM mensagem m
       LEFT JOIN mensagem_leitura ml ON ml.MensagemGUID = m.MensagemGUID AND ml.UsuarioCPF = ?
       WHERE m.ConversaGUID = ?
         AND m.MensagemDeletedAt IS NULL
         AND m.MensagemRemetenteCPF != ?
         AND ml.MensagemGUID IS NULL`,
      [usuarioCPF, conversaGUID, usuarioCPF]
    );
    return (rows as RowDataPacket[])[0]?.total ?? 0;
  }

  async pinMessage(
    mensagemGUID: string,
    conversaGUID: string,
    fixadaPorCPF: string
  ): Promise<{ FixadaAt: Date }> {
    console.log('🟢 MensagemDAO.pinMessage()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `INSERT IGNORE INTO mensagem_fixada (MensagemGUID, ConversaGUID, FixadaPorCPF)
       VALUES (?, ?, ?)`,
      [mensagemGUID, conversaGUID, fixadaPorCPF]
    );
    const [rows] = await pool.execute(
      `SELECT FixadaAt FROM mensagem_fixada WHERE MensagemGUID = ? LIMIT 1`,
      [mensagemGUID]
    );
    const fixadaAt = (rows as RowDataPacket[])[0]?.FixadaAt as Date;
    return { FixadaAt: fixadaAt };
  }

  async unpinMessage(mensagemGUID: string): Promise<void> {
    console.log('🟢 MensagemDAO.unpinMessage()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `DELETE FROM mensagem_fixada WHERE MensagemGUID = ?`,
      [mensagemGUID]
    );
  }

  async softDelete(mensagemGUID: string): Promise<void> {
    console.log('🟢 MensagemDAO.softDelete()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE mensagem SET MensagemDeletedAt = NOW() WHERE MensagemGUID = ?`,
      [mensagemGUID]
    );
  }

  async edit(mensagemGUID: string, novoConteudo: string): Promise<{ MensagemEditadaAt: Date }> {
    console.log('🟢 MensagemDAO.edit()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE mensagem SET MensagemConteudo = ?, MensagemEditadaAt = NOW() WHERE MensagemGUID = ?`,
      [novoConteudo, mensagemGUID]
    );
    const [rows] = await pool.execute(
      `SELECT MensagemEditadaAt FROM mensagem WHERE MensagemGUID = ? LIMIT 1`,
      [mensagemGUID]
    );
    return { MensagemEditadaAt: (rows as RowDataPacket[])[0].MensagemEditadaAt as Date };
  }

  async findPinnedMessages(conversaGUID: string): Promise<MensagemFixadaRow[]> {
    console.log('🟢 MensagemDAO.findPinnedMessages()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT
         mf.MensagemGUID,
         mf.ConversaGUID,
         mf.FixadaPorCPF,
         mf.FixadaAt,
         m.MensagemConteudo,
         m.MensagemRemetenteCPF,
         m.MensagemCreatedAt,
         m.MensagemTipo
       FROM mensagem_fixada mf
       INNER JOIN mensagem m ON m.MensagemGUID = mf.MensagemGUID
       WHERE mf.ConversaGUID = ?
         AND m.MensagemDeletedAt IS NULL
       ORDER BY mf.FixadaAt DESC`,
      [conversaGUID]
    );
    return rows as MensagemFixadaRow[];
  }
}
