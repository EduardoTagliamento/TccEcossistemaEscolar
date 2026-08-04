import MysqlDatabase from "../database/MysqlDatabase";
import MaterialDidaticoPagina, { MaterialDidaticoPaginaStatus } from "../entities/materialdidaticopagina.model";

interface MaterialDidaticoPaginaRow {
  MaterialDidaticoPaginaGUID: string;
  MaterialDidaticoGUID: string;
  NumeroPagina: number;
  ArquivoUrl: string;
  TextoExtraido: string | null;
  StatusExtracao: MaterialDidaticoPaginaStatus;
  RevisadoPorCPF: string | null;
  RevisadoEm: Date | null;
  ExtraidoEm: Date | null;
}

export class MaterialDidaticoPaginaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  MaterialDidaticoPaginaDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (pagina: MaterialDidaticoPagina): Promise<void> => {
    console.log("🟢 MaterialDidaticoPaginaDAO.create()");

    const SQL = `
      INSERT INTO materialdidaticopagina (MaterialDidaticoPaginaGUID, MaterialDidaticoGUID, NumeroPagina, ArquivoUrl, StatusExtracao)
      VALUES (?, ?, ?, ?, ?)
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [
      pagina.MaterialDidaticoPaginaGUID,
      pagina.MaterialDidaticoGUID,
      pagina.NumeroPagina,
      pagina.ArquivoUrl,
      pagina.StatusExtracao,
    ]);
  };

  findById = async (guid: string): Promise<MaterialDidaticoPagina | null> => {
    console.log("🟢 MaterialDidaticoPaginaDAO.findById()");

    const SQL = `SELECT * FROM materialdidaticopagina WHERE MaterialDidaticoPaginaGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as MaterialDidaticoPaginaRow[]);
    return lista[0] || null;
  };

  findByMaterial = async (materialDidaticoGUID: string): Promise<MaterialDidaticoPagina[]> => {
    console.log("🟢 MaterialDidaticoPaginaDAO.findByMaterial()");

    const SQL = `SELECT * FROM materialdidaticopagina WHERE MaterialDidaticoGUID = ? ORDER BY NumeroPagina ASC`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materialDidaticoGUID]);
    return this.mapRows(rows as MaterialDidaticoPaginaRow[]);
  };

  /** Faixa de páginas de um capítulo, já revisadas (RevisadoPorCPF preenchido) — únicas que "valem" pra grounding (spec item 10). */
  findRevisadasNaFaixa = async (
    materialDidaticoGUID: string,
    paginaInicio: number,
    paginaFim: number
  ): Promise<MaterialDidaticoPagina[]> => {
    console.log("🟢 MaterialDidaticoPaginaDAO.findRevisadasNaFaixa()");

    const SQL = `
      SELECT * FROM materialdidaticopagina
      WHERE MaterialDidaticoGUID = ? AND NumeroPagina BETWEEN ? AND ? AND RevisadoPorCPF IS NOT NULL
      ORDER BY NumeroPagina ASC
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [materialDidaticoGUID, paginaInicio, paginaFim]);
    return this.mapRows(rows as MaterialDidaticoPaginaRow[]);
  };

  /** Grava o resultado (sucesso ou falha) do job assíncrono de extração. */
  atualizarExtracao = async (
    guid: string,
    dados: { TextoExtraido: string | null; StatusExtracao: MaterialDidaticoPaginaStatus }
  ): Promise<void> => {
    console.log("🟢 MaterialDidaticoPaginaDAO.atualizarExtracao()");

    const SQL = `
      UPDATE materialdidaticopagina
      SET TextoExtraido = ?, StatusExtracao = ?, ExtraidoEm = CURRENT_TIMESTAMP
      WHERE MaterialDidaticoPaginaGUID = ?
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [dados.TextoExtraido, dados.StatusExtracao, guid]);
  };

  /** Revisão humana obrigatória (spec item 10) — só depois disso o texto "vale" oficialmente. */
  revisar = async (guid: string, revisadoPorCPF: string, textoRevisado: string): Promise<void> => {
    console.log("🟢 MaterialDidaticoPaginaDAO.revisar()");

    const SQL = `
      UPDATE materialdidaticopagina
      SET TextoExtraido = ?, RevisadoPorCPF = ?, RevisadoEm = CURRENT_TIMESTAMP
      WHERE MaterialDidaticoPaginaGUID = ?
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [textoRevisado, revisadoPorCPF, guid]);
  };

  private mapRows(rows: MaterialDidaticoPaginaRow[]): MaterialDidaticoPagina[] {
    return rows.map((row) => {
      const pagina = new MaterialDidaticoPagina();
      pagina.MaterialDidaticoPaginaGUID = row.MaterialDidaticoPaginaGUID;
      pagina.MaterialDidaticoGUID = row.MaterialDidaticoGUID;
      pagina.NumeroPagina = row.NumeroPagina;
      pagina.ArquivoUrl = row.ArquivoUrl;
      pagina.TextoExtraido = row.TextoExtraido;
      pagina.StatusExtracao = row.StatusExtracao;
      pagina.RevisadoPorCPF = row.RevisadoPorCPF;
      pagina.RevisadoEm = row.RevisadoEm ? new Date(row.RevisadoEm) : null;
      pagina.ExtraidoEm = row.ExtraidoEm ? new Date(row.ExtraidoEm) : null;
      return pagina;
    });
  }
}
