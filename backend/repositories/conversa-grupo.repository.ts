import ConversaGrupo from '../entities/conversa-grupo.model';
import ConversaGrupoMembro from '../entities/conversa-grupo-membro.model';
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket } from 'mysql2';

interface ConversaGrupoRow extends RowDataPacket {
  ConversaGUID: string;
  ConversaGrupoNome: string;
  ConversaGrupoTipo: 'Turma' | 'Tarefa';
  ConversaGrupoRefGUID: string;
}

type MembroFuncaoType = 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';

interface ConversaGrupoMembroRow extends RowDataPacket {
  ConversaGUID: string;
  MembroUsuarioCPF: string;
  MembroFuncao: MembroFuncaoType;
  MembroStatus: 'Ativo' | 'Inativo';
  MembroEntradaAt: Date;
  MembroSaidaAt: Date | null;
}

interface GrupoTarefaExpiradoRow extends RowDataPacket {
  ConversaGUID: string;
  ConversaGrupoRefGUID: string;
}

export class ConversaGrupoDAO {
  #database: MysqlDatabase;

  constructor(database: MysqlDatabase) {
    console.log('⬆️  ConversaGrupoDAO.constructor()');
    this.#database = database;
  }

  async createGrupo(
    conversaGUID: string,
    nome: string,
    tipo: 'Turma' | 'Tarefa',
    refGUID: string
  ): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.createGrupo()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `INSERT INTO conversa_grupo (ConversaGUID, ConversaGrupoNome, ConversaGrupoTipo, ConversaGrupoRefGUID)
       VALUES (?, ?, ?, ?)`,
      [conversaGUID, nome, tipo, refGUID]
    );
  }

  async findByRefGUID(refGUID: string): Promise<ConversaGrupo | null> {
    console.log('🟢 ConversaGrupoDAO.findByRefGUID()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM conversa_grupo WHERE ConversaGrupoRefGUID = ? LIMIT 1`,
      [refGUID]
    );
    const list = rows as ConversaGrupoRow[];
    if (list.length === 0) return null;
    return ConversaGrupo.fromDatabase(list[0]);
  }

  async findByConversaGUID(conversaGUID: string): Promise<ConversaGrupo | null> {
    console.log('🟢 ConversaGrupoDAO.findByConversaGUID()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM conversa_grupo WHERE ConversaGUID = ? LIMIT 1`,
      [conversaGUID]
    );
    const list = rows as ConversaGrupoRow[];
    if (list.length === 0) return null;
    return ConversaGrupo.fromDatabase(list[0]);
  }

  async updateNome(conversaGUID: string, nome: string): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.updateNome()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE conversa_grupo SET ConversaGrupoNome = ? WHERE ConversaGUID = ?`,
      [nome, conversaGUID]
    );
  }

  async addMembro(conversaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.addMembro()');
    const pool = await this.#database.getPool();
    // Upsert: se já existe (talvez inativo), reativa; se não existe, insere
    await pool.execute(
      `INSERT INTO conversa_grupo_membro (ConversaGUID, MembroUsuarioCPF, MembroFuncao, MembroStatus, MembroEntradaAt, MembroSaidaAt)
       VALUES (?, ?, 'Membro', 'Ativo', NOW(), NULL)
       ON DUPLICATE KEY UPDATE MembroStatus = 'Ativo', MembroSaidaAt = NULL, MembroEntradaAt = NOW()`,
      [conversaGUID, usuarioCPF]
    );
  }

  async removeMembro(conversaGUID: string, usuarioCPF: string): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.removeMembro()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE conversa_grupo_membro
       SET MembroStatus = 'Inativo', MembroSaidaAt = NOW()
       WHERE ConversaGUID = ? AND MembroUsuarioCPF = ?`,
      [conversaGUID, usuarioCPF]
    );
  }

  async findMembros(conversaGUID: string): Promise<ConversaGrupoMembro[]> {
    console.log('🟢 ConversaGrupoDAO.findMembros()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM conversa_grupo_membro
       WHERE ConversaGUID = ? AND MembroStatus = 'Ativo'
       ORDER BY MembroEntradaAt ASC`,
      [conversaGUID]
    );
    return (rows as ConversaGrupoMembroRow[]).map((r) => ConversaGrupoMembro.fromDatabase(r));
  }

  async isMembro(conversaGUID: string, usuarioCPF: string): Promise<boolean> {
    console.log('🟢 ConversaGrupoDAO.isMembro()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT 1 FROM conversa_grupo_membro
       WHERE ConversaGUID = ? AND MembroUsuarioCPF = ? AND MembroStatus = 'Ativo'
       LIMIT 1`,
      [conversaGUID, usuarioCPF]
    );
    return (rows as RowDataPacket[]).length > 0;
  }

  async setFuncao(conversaGUID: string, usuarioCPF: string, funcao: MembroFuncaoType): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.setFuncao()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE conversa_grupo_membro SET MembroFuncao = ?
       WHERE ConversaGUID = ? AND MembroUsuarioCPF = ? AND MembroStatus = 'Ativo'`,
      [funcao, conversaGUID, usuarioCPF]
    );
  }

  async getFuncao(conversaGUID: string, usuarioCPF: string): Promise<MembroFuncaoType | null> {
    console.log('🟢 ConversaGrupoDAO.getFuncao()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT MembroFuncao FROM conversa_grupo_membro
       WHERE ConversaGUID = ? AND MembroUsuarioCPF = ? AND MembroStatus = 'Ativo' LIMIT 1`,
      [conversaGUID, usuarioCPF]
    );
    const list = rows as RowDataPacket[];
    if (list.length === 0) return null;
    return list[0].MembroFuncao as MembroFuncaoType;
  }

  async findByFuncao(conversaGUID: string, funcao: MembroFuncaoType): Promise<ConversaGrupoMembro | null> {
    console.log('🟢 ConversaGrupoDAO.findByFuncao()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM conversa_grupo_membro
       WHERE ConversaGUID = ? AND MembroFuncao = ? AND MembroStatus = 'Ativo' LIMIT 1`,
      [conversaGUID, funcao]
    );
    const list = rows as ConversaGrupoMembroRow[];
    if (list.length === 0) return null;
    return ConversaGrupoMembro.fromDatabase(list[0]);
  }

  async findAllByFuncao(conversaGUID: string, funcao: MembroFuncaoType): Promise<ConversaGrupoMembro[]> {
    console.log('🟢 ConversaGrupoDAO.findAllByFuncao()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM conversa_grupo_membro
       WHERE ConversaGUID = ? AND MembroFuncao = ? AND MembroStatus = 'Ativo'`,
      [conversaGUID, funcao]
    );
    return (rows as ConversaGrupoMembroRow[]).map((r) => ConversaGrupoMembro.fromDatabase(r));
  }

  async findGruposTarefasExpirados(): Promise<GrupoTarefaExpiradoRow[]> {
    console.log('🟢 ConversaGrupoDAO.findGruposTarefasExpirados()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT cg.ConversaGUID, cg.ConversaGrupoRefGUID
       FROM conversa_grupo cg
       INNER JOIN conversa c ON c.ConversaGUID = cg.ConversaGUID
       INNER JOIN grupotarefa gt ON gt.GrupoTarefaGUID = cg.ConversaGrupoRefGUID
       INNER JOIN tarefaacademica ta ON ta.TarefaGUID = gt.TarefaGUID
       WHERE cg.ConversaGrupoTipo = 'Tarefa'
         AND ta.TarefaPrazoData < NOW()
         AND c.ConversaStatus = 'Ativa'`
    );
    return rows as GrupoTarefaExpiradoRow[];
  }
}
