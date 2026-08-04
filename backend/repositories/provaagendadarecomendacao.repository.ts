import { RowDataPacket } from "mysql2";
import MysqlDatabase from "../database/MysqlDatabase";
import ProvaAgendadaRecomendacao, {
  ProvaAgendadaRecomendacaoStatus,
  RecomendacaoFonte,
  RecomendacaoVideo,
  RecomendacaoPaginaLivro,
} from "../entities/provaagendadarecomendacao.model";

interface ProvaAgendadaRecomendacaoRow extends RowDataPacket {
  ProvaAgendadaRecomendacaoGUID: string;
  ProvaAgendadaGUID: string;
  VideosJson: RecomendacaoVideo[] | string | null;
  ResumoTexto: string | null;
  FontesUsadas: RecomendacaoFonte[] | string | null;
  ModeloUsado: string | null;
  StatusGeracao: ProvaAgendadaRecomendacaoStatus;
  ErroGeracao: string | null;
  PaginaLivroJson: RecomendacaoPaginaLivro | string | null;
  SubMateriaGlobalGUID: string | null;
  GeradoEm: Date;
  UpdatedAt: Date;
}

export class ProvaAgendadaRecomendacaoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ProvaAgendadaRecomendacaoDAO.constructor()");
    this.#database = databaseInstance;
  }

  /**
   * Upsert — uma prova só tem UMA linha de recomendação (UNIQUE em
   * ProvaAgendadaGUID); regeneração (spec item 21) sobrescreve a anterior.
   */
  upsert = async (recomendacao: ProvaAgendadaRecomendacao): Promise<void> => {
    console.log("🟢 ProvaAgendadaRecomendacaoDAO.upsert()");

    const SQL = `
      INSERT INTO provaagendadarecomendacao
        (ProvaAgendadaRecomendacaoGUID, ProvaAgendadaGUID, VideosJson, ResumoTexto, FontesUsadas, ModeloUsado, StatusGeracao, ErroGeracao, PaginaLivroJson, SubMateriaGlobalGUID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        VideosJson = VALUES(VideosJson),
        ResumoTexto = VALUES(ResumoTexto),
        FontesUsadas = VALUES(FontesUsadas),
        ModeloUsado = VALUES(ModeloUsado),
        StatusGeracao = VALUES(StatusGeracao),
        ErroGeracao = VALUES(ErroGeracao),
        PaginaLivroJson = VALUES(PaginaLivroJson),
        SubMateriaGlobalGUID = VALUES(SubMateriaGlobalGUID),
        GeradoEm = CURRENT_TIMESTAMP;
    `;
    const params = [
      recomendacao.ProvaAgendadaRecomendacaoGUID,
      recomendacao.ProvaAgendadaGUID,
      recomendacao.VideosJson ? JSON.stringify(recomendacao.VideosJson) : null,
      recomendacao.ResumoTexto,
      recomendacao.FontesUsadas ? JSON.stringify(recomendacao.FontesUsadas) : null,
      recomendacao.ModeloUsado,
      recomendacao.StatusGeracao,
      recomendacao.ErroGeracao,
      recomendacao.PaginaLivroJson ? JSON.stringify(recomendacao.PaginaLivroJson) : null,
      recomendacao.SubMateriaGlobalGUID,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);
  };

  findByProva = async (provaAgendadaGUID: string): Promise<ProvaAgendadaRecomendacao | null> => {
    console.log("🟢 ProvaAgendadaRecomendacaoDAO.findByProva()");

    const SQL = `SELECT * FROM provaagendadarecomendacao WHERE ProvaAgendadaGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProvaAgendadaRecomendacaoRow[]>(SQL, [provaAgendadaGUID]);

    return rows[0] ? this.mapRow(rows[0]) : null;
  };

  private mapRow(row: ProvaAgendadaRecomendacaoRow): ProvaAgendadaRecomendacao {
    const recomendacao = new ProvaAgendadaRecomendacao();
    recomendacao.ProvaAgendadaRecomendacaoGUID = row.ProvaAgendadaRecomendacaoGUID;
    recomendacao.ProvaAgendadaGUID = row.ProvaAgendadaGUID;
    recomendacao.VideosJson = this.parseJsonColuna<RecomendacaoVideo[]>(row.VideosJson);
    recomendacao.ResumoTexto = row.ResumoTexto;
    recomendacao.FontesUsadas = this.parseJsonColuna<RecomendacaoFonte[]>(row.FontesUsadas);
    recomendacao.ModeloUsado = row.ModeloUsado;
    recomendacao.StatusGeracao = row.StatusGeracao;
    recomendacao.ErroGeracao = row.ErroGeracao;
    recomendacao.PaginaLivroJson = this.parseJsonColuna<RecomendacaoPaginaLivro>(row.PaginaLivroJson);
    recomendacao.SubMateriaGlobalGUID = row.SubMateriaGlobalGUID;
    recomendacao.GeradoEm = row.GeradoEm ? new Date(row.GeradoEm) : null;
    recomendacao.UpdatedAt = row.UpdatedAt ? new Date(row.UpdatedAt) : null;
    return recomendacao;
  }

  /** mysql2 já devolve coluna JSON como objeto na maioria dos casos, mas trata string por segurança. */
  private parseJsonColuna<T>(valor: unknown): T | null {
    if (valor === null || valor === undefined) return null;
    if (typeof valor === "string") {
      try {
        return JSON.parse(valor) as T;
      } catch {
        return null;
      }
    }
    return valor as T;
  }
}
