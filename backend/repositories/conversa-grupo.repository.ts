import ConversaGrupo from '../entities/conversa-grupo.model';
import ConversaGrupoMembro from '../entities/conversa-grupo-membro.model';
import MysqlDatabase from '../database/MysqlDatabase';
import { RowDataPacket } from 'mysql2';

interface ConversaGrupoRow extends RowDataPacket {
  ConversaGUID: string;
  ConversaGrupoNome: string;
  ConversaGrupoTipo: 'Turma' | 'Tarefa';
  ConversaGrupoRefGUID: string;
  ConversaGrupoCorFundo: string | null;
  ConversaGrupoImagemUrl: string | null;
}

type MembroFuncaoType = 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante';

interface ConversaGrupoMembroRow extends RowDataPacket {
  ConversaGUID: string;
  MembroUsuarioGUID: string;
  MembroFuncao: MembroFuncaoType;
  MembroStatus: 'Ativo' | 'Inativo';
  MembroEntradaAt: Date;
  MembroSaidaAt: Date | null;
  MembroPermissoes: Record<string, boolean> | string | null;
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

  /** Personalização do grupo (nome/cor/foto) — usado pelo endpoint de
   * personalização, distinto de updateNome (que só serve a sincronização
   * automática vinda do nome da turma). */
  async atualizarPersonalizacao(
    conversaGUID: string,
    updates: Partial<{ ConversaGrupoNome: string; ConversaGrupoCorFundo: string; ConversaGrupoImagemUrl: string }>
  ): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.atualizarPersonalizacao()');

    const campos: string[] = [];
    const valores: any[] = [];

    if (updates.ConversaGrupoNome !== undefined) {
      campos.push('ConversaGrupoNome = ?');
      valores.push(updates.ConversaGrupoNome);
    }
    if (updates.ConversaGrupoCorFundo !== undefined) {
      campos.push('ConversaGrupoCorFundo = ?');
      valores.push(updates.ConversaGrupoCorFundo);
    }
    if (updates.ConversaGrupoImagemUrl !== undefined) {
      campos.push('ConversaGrupoImagemUrl = ?');
      valores.push(updates.ConversaGrupoImagemUrl);
    }

    if (campos.length === 0) return;

    valores.push(conversaGUID);
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE conversa_grupo SET ${campos.join(', ')} WHERE ConversaGUID = ?`,
      valores
    );
  }

  async addMembro(conversaGUID: string, usuarioGUID: string): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.addMembro()');
    const pool = await this.#database.getPool();
    // Upsert: se já existe (talvez inativo), reativa; se não existe, insere
    await pool.execute(
      `INSERT INTO conversa_grupo_membro (ConversaGUID, MembroUsuarioGUID, MembroFuncao, MembroStatus, MembroEntradaAt, MembroSaidaAt)
       VALUES (?, ?, 'Membro', 'Ativo', NOW(), NULL)
       ON DUPLICATE KEY UPDATE MembroStatus = 'Ativo', MembroSaidaAt = NULL, MembroEntradaAt = NOW()`,
      [conversaGUID, usuarioGUID]
    );
  }

  async removeMembro(conversaGUID: string, usuarioGUID: string): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.removeMembro()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE conversa_grupo_membro
       SET MembroStatus = 'Inativo', MembroSaidaAt = NOW()
       WHERE ConversaGUID = ? AND MembroUsuarioGUID = ?`,
      [conversaGUID, usuarioGUID]
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

  // Rows cruas com nome do usuário via JOIN — só para exibição (não é a entidade ConversaGrupoMembro,
  // que espelha 1:1 a tabela conversa_grupo_membro e não tem coluna de nome).
  async findMembrosComNome(conversaGUID: string): Promise<
    { MembroUsuarioGUID: string; UsuarioNome: string; UsuarioFotoUrl: string | null; MembroFuncao: MembroFuncaoType; MembroEntradaAt: Date }[]
  > {
    console.log('🟢 ConversaGrupoDAO.findMembrosComNome()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT cgm.MembroUsuarioGUID, u.UsuarioNome, u.UsuarioFotoUrl, cgm.MembroFuncao, cgm.MembroEntradaAt
       FROM conversa_grupo_membro cgm
       INNER JOIN usuario u ON u.UsuarioGUID = cgm.MembroUsuarioGUID
       WHERE cgm.ConversaGUID = ? AND cgm.MembroStatus = 'Ativo'
       ORDER BY cgm.MembroEntradaAt ASC`,
      [conversaGUID]
    );
    return rows as any[];
  }

  async isMembro(conversaGUID: string, usuarioGUID: string): Promise<boolean> {
    console.log('🟢 ConversaGrupoDAO.isMembro()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT 1 FROM conversa_grupo_membro
       WHERE ConversaGUID = ? AND MembroUsuarioGUID = ? AND MembroStatus = 'Ativo'
       LIMIT 1`,
      [conversaGUID, usuarioGUID]
    );
    return (rows as RowDataPacket[]).length > 0;
  }

  async setFuncao(conversaGUID: string, usuarioGUID: string, funcao: MembroFuncaoType): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.setFuncao()');
    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE conversa_grupo_membro SET MembroFuncao = ?
       WHERE ConversaGUID = ? AND MembroUsuarioGUID = ? AND MembroStatus = 'Ativo'`,
      [funcao, conversaGUID, usuarioGUID]
    );
  }

  async getFuncao(conversaGUID: string, usuarioGUID: string): Promise<MembroFuncaoType | null> {
    console.log('🟢 ConversaGrupoDAO.getFuncao()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT MembroFuncao FROM conversa_grupo_membro
       WHERE ConversaGUID = ? AND MembroUsuarioGUID = ? AND MembroStatus = 'Ativo' LIMIT 1`,
      [conversaGUID, usuarioGUID]
    );
    const list = rows as RowDataPacket[];
    if (list.length === 0) return null;
    return list[0].MembroFuncao as MembroFuncaoType;
  }

  /** Linha completa do membro (incl. MembroPermissoes) — getFuncao() só traz o enum. */
  async findMembro(conversaGUID: string, usuarioGUID: string): Promise<ConversaGrupoMembro | null> {
    console.log('🟢 ConversaGrupoDAO.findMembro()');
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(
      `SELECT * FROM conversa_grupo_membro
       WHERE ConversaGUID = ? AND MembroUsuarioGUID = ? AND MembroStatus = 'Ativo' LIMIT 1`,
      [conversaGUID, usuarioGUID]
    );
    const list = rows as ConversaGrupoMembroRow[];
    if (list.length === 0) return null;
    return ConversaGrupoMembro.fromDatabase(list[0]);
  }

  /** Concede/revoga capacidades específicas ao membro (merge com o que já existe). */
  async atualizarPermissaoMembro(conversaGUID: string, usuarioGUID: string, patch: Record<string, boolean>): Promise<void> {
    console.log('🟢 ConversaGrupoDAO.atualizarPermissaoMembro()');
    const atual = await this.findMembro(conversaGUID, usuarioGUID);
    const mesclado = { ...(atual?.MembroPermissoes ?? {}), ...patch };

    const pool = await this.#database.getPool();
    await pool.execute(
      `UPDATE conversa_grupo_membro SET MembroPermissoes = ? WHERE ConversaGUID = ? AND MembroUsuarioGUID = ?`,
      [JSON.stringify(mesclado), conversaGUID, usuarioGUID]
    );
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
