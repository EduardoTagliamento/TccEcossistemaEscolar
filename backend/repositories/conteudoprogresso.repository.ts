import MysqlDatabase from "../database/MysqlDatabase";
import ConteudoProgresso from "../entities/conteudoprogresso.model";

interface ConteudoProgressoRow {
  ConteudoProgressoGUID: string;
  ConteudoGUID: string;
  MatriculaGUID: string;
  PercentualConcluido: number;
  UltimaPosicaoSegundos: number | null;
  ConcluidoEm: Date | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export class ConteudoProgressoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ConteudoProgressoDAO.constructor()");
    this.#database = databaseInstance;
  }

  findByConteudoEMatricula = async (conteudoGUID: string, matriculaGUID: string): Promise<ConteudoProgresso | null> => {
    console.log("🟢 ConteudoProgressoDAO.findByConteudoEMatricula()");

    const SQL = `SELECT * FROM conteudoprogresso WHERE ConteudoGUID = ? AND MatriculaGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [conteudoGUID, matriculaGUID]);

    const lista = this.mapRows(rows as ConteudoProgressoRow[]);
    return lista[0] || null;
  };

  upsert = async (progresso: ConteudoProgresso): Promise<void> => {
    console.log("🟢 ConteudoProgressoDAO.upsert()");

    const SQL = `
      INSERT INTO conteudoprogresso
        (ConteudoProgressoGUID, ConteudoGUID, MatriculaGUID, PercentualConcluido, UltimaPosicaoSegundos, ConcluidoEm)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        PercentualConcluido = VALUES(PercentualConcluido),
        UltimaPosicaoSegundos = VALUES(UltimaPosicaoSegundos),
        ConcluidoEm = VALUES(ConcluidoEm),
        UpdatedAt = CURRENT_TIMESTAMP;
    `;
    const params = [
      progresso.ConteudoProgressoGUID,
      progresso.ConteudoGUID,
      progresso.MatriculaGUID,
      progresso.PercentualConcluido,
      progresso.UltimaPosicaoSegundos,
      progresso.ConcluidoEm,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);
  };

  /** Registra 1 página vista (idempotente) e retorna quantas páginas distintas já foram vistas nesse conteúdo. */
  registrarPaginaVista = async (
    conteudoPaginadoArquivoGUID: string,
    matriculaGUID: string,
    visualizacaoGUID: string
  ): Promise<void> => {
    console.log("🟢 ConteudoProgressoDAO.registrarPaginaVista()");

    const SQL = `
      INSERT IGNORE INTO conteudopaginadovisualizacao
        (ConteudoPaginadoVisualizacaoGUID, ConteudoPaginadoArquivoGUID, MatriculaGUID)
      VALUES (?, ?, ?);
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [visualizacaoGUID, conteudoPaginadoArquivoGUID, matriculaGUID]);
  };

  /** Conta quantas páginas distintas (de um dado Conteudo) uma matrícula já visualizou. */
  contarPaginasVistas = async (conteudoGUID: string, matriculaGUID: string): Promise<number> => {
    console.log("🟢 ConteudoProgressoDAO.contarPaginasVistas()");

    const SQL = `
      SELECT COUNT(DISTINCT v.ConteudoPaginadoArquivoGUID) AS total
      FROM conteudopaginadovisualizacao v
      INNER JOIN conteudopaginadoarquivo p ON p.ConteudoPaginadoArquivoGUID = v.ConteudoPaginadoArquivoGUID
      WHERE p.ConteudoGUID = ? AND v.MatriculaGUID = ?;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [conteudoGUID, matriculaGUID]);
    return (rows as Array<{ total: number }>)[0]?.total ?? 0;
  };

  private mapRows(rows: ConteudoProgressoRow[]): ConteudoProgresso[] {
    return rows.map((row) => {
      const progresso = new ConteudoProgresso();
      progresso.ConteudoProgressoGUID = row.ConteudoProgressoGUID;
      progresso.ConteudoGUID = row.ConteudoGUID;
      progresso.MatriculaGUID = row.MatriculaGUID;
      progresso.PercentualConcluido = row.PercentualConcluido;
      progresso.UltimaPosicaoSegundos = row.UltimaPosicaoSegundos;
      progresso.ConcluidoEm = row.ConcluidoEm ? new Date(row.ConcluidoEm) : null;
      progresso.CreatedAt = new Date(row.CreatedAt);
      progresso.UpdatedAt = new Date(row.UpdatedAt);
      return progresso;
    });
  }
}
