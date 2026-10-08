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
  TentativasResumo: number;
  FontesUsadas: RecomendacaoFonte[] | string | null;
  ModeloUsado: string | null;
  StatusGeracao: ProvaAgendadaRecomendacaoStatus;
  ErroGeracao: string | null;
  PaginaLivroJson: RecomendacaoPaginaLivro[] | string | null;
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
      recomendacao.PaginaLivroJson.length > 0 ? JSON.stringify(recomendacao.PaginaLivroJson) : null,
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
    recomendacao.TentativasResumo = row.TentativasResumo;
    recomendacao.FontesUsadas = this.parseJsonColuna<RecomendacaoFonte[]>(row.FontesUsadas);
    recomendacao.ModeloUsado = row.ModeloUsado;
    recomendacao.StatusGeracao = row.StatusGeracao;
    recomendacao.ErroGeracao = row.ErroGeracao;
    // Dado legado (antes da prova suportar N capítulos) guardava um objeto
    // único em vez de array — normaliza pra não quebrar leitura de cache
    // antigo ainda não regenerado.
    const paginaLivroParseada = this.parseJsonColuna<RecomendacaoPaginaLivro[] | RecomendacaoPaginaLivro>(row.PaginaLivroJson);
    recomendacao.PaginaLivroJson = Array.isArray(paginaLivroParseada)
      ? paginaLivroParseada
      : paginaLivroParseada
        ? [paginaLivroParseada]
        : [];
    recomendacao.SubMateriaGlobalGUID = row.SubMateriaGlobalGUID;
    recomendacao.GeradoEm = row.GeradoEm ? new Date(row.GeradoEm) : null;
    recomendacao.UpdatedAt = row.UpdatedAt ? new Date(row.UpdatedAt) : null;
    return recomendacao;
  }

  /** Provas com resumo faltando (falha parcial — StatusGeracao pode estar 'Concluida' mesmo
   * assim, se vídeo/página de livro deram certo) que ainda vão acontecer (sem sentido reprocessar
   * pra uma prova que já passou) e não excederam o teto de tentativas — alimenta o scheduler de
   * retry. `limite`/`maxTentativas` são sempre valor interno do código, nunca input de usuário —
   * interpolados como inteiro literal (prepared statement com LIMIT bindado quebra no mysql2,
   * mesmo padrão de WhatsappFilaReenvioDAO.buscarPendentes). */
  buscarComResumoFaltando = async (limite: number, maxTentativas: number): Promise<string[]> => {
    console.log("🟢 ProvaAgendadaRecomendacaoDAO.buscarComResumoFaltando()");

    const limiteSeguro = Number.isInteger(limite) && limite > 0 ? limite : 5;
    const maxTentativasSeguro = Number.isInteger(maxTentativas) && maxTentativas > 0 ? maxTentativas : 5;

    const SQL = `
      SELECT rec.ProvaAgendadaGUID
      FROM provaagendadarecomendacao rec
      INNER JOIN provaagendada pa ON pa.ProvaAgendadaGUID = rec.ProvaAgendadaGUID
      WHERE rec.ResumoTexto IS NULL
        AND rec.TentativasResumo < ${maxTentativasSeguro}
        AND pa.ProvaData >= NOW()
      ORDER BY rec.GeradoEm ASC
      LIMIT ${limiteSeguro}
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL);
    return rows.map((r) => r.ProvaAgendadaGUID as string);
  };

  incrementarTentativasResumo = async (provaAgendadaGUID: string): Promise<void> => {
    console.log("🟢 ProvaAgendadaRecomendacaoDAO.incrementarTentativasResumo()");

    const SQL = `UPDATE provaagendadarecomendacao SET TentativasResumo = TentativasResumo + 1 WHERE ProvaAgendadaGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [provaAgendadaGUID]);
  };

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
