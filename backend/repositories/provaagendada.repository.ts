import ProvaAgendada from "../entities/provaagendada.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface ProvaAgendadaRow extends RowDataPacket {
  ProvaAgendadaGUID: string;
  MateriaGUID: string;
  ProvaTitulo: string;
  ProvaData: Date;
  ProvaDescricao: string | null;
  ProvaStatus: "Agendada" | "Realizada" | "Cancelada";
  CriadoPorRepresentanteUsuarioGUID: string | null;
  ProvaModoAutomatico: number | boolean;
  ProvaSemanaBase: string | null;
  ProvaDiaSemana: string | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface ProvaAgendadaAnexoRow extends RowDataPacket {
  AnexoGUID: string;
  AnexoNomeOriginal: string | null;
  AnexoCaminho: string;
  AnexoTamanho: number | null;
}

export interface ProvaAgendadaFilters {
  MateriaGUID?: string;
  ProvaStatus?: "Agendada" | "Realizada" | "Cancelada";
  DataInicio?: Date;
  DataFim?: Date;
  /**
   * `provaagendada` não guarda `EscolaGUID` própria — só via a tabela pivô
   * `provaagendada_turma -> turma.EscolaGUID` (uma prova pode valer pra N
   * turmas). Filtro via EXISTS (não JOIN) pra não duplicar linha quando a
   * prova tem mais de uma turma na mesma escola. Ver
   * docs/PLANO_IMPLEMENTACAO_API_KEYS.md.
   */
  EscolaGUID?: string;
}

/**
 * Repository (DAO) para a entidade ProvaAgendada (NORMALIZADA)
 *
 * Responsabilidades:
 * - CRUD completo na tabela `provaagendada` (dados únicos da prova)
 * - Operações na tabela pivô `relacaoanexosprova`
 * - Conversão entre rows do MySQL e objetos ProvaAgendada
 * 
 * ⚠️ TurmaGUID foi REMOVIDO - Agora está em ProvaAgendadaTurmaDAO
 */
export class ProvaAgendadaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  ProvaAgendadaDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (prova: ProvaAgendada): Promise<ProvaAgendada> => {
    console.log("🟢 ProvaAgendadaDAO.create()");

    const SQL = `
      INSERT INTO provaagendada
      (ProvaAgendadaGUID, MateriaGUID, ProvaTitulo, ProvaData, ProvaDescricao, ProvaStatus,
       CriadoPorRepresentanteUsuarioGUID, ProvaModoAutomatico, ProvaSemanaBase, ProvaDiaSemana)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      prova.ProvaAgendadaGUID,
      prova.MateriaGUID,
      prova.ProvaTitulo,
      prova.ProvaData,
      prova.ProvaDescricao,
      prova.ProvaStatus,
      prova.CriadoPorRepresentanteUsuarioGUID,
      prova.ProvaModoAutomatico,
      prova.ProvaSemanaBase,
      prova.ProvaDiaSemana,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    if (prova.CapitulosGUIDs.length > 0) {
      await this.substituirCapitulos(prova.ProvaAgendadaGUID, prova.CapitulosGUIDs);
    }

    return prova;
  };

  /**
   * Substitui todos os capítulos vinculados a uma prova (apaga e recria) —
   * mais simples que diff, e o volume por prova é baixo (poucos capítulos).
   */
  substituirCapitulos = async (ProvaAgendadaGUID: string, capitulosGUIDs: string[]): Promise<void> => {
    console.log("🟢 ProvaAgendadaDAO.substituirCapitulos()");

    const pool = await this.#database.getPool();
    await pool.execute("DELETE FROM provaagendadacapitulo WHERE ProvaAgendadaGUID = ?;", [ProvaAgendadaGUID]);

    for (const capituloGUID of capitulosGUIDs) {
      await pool.execute(
        `INSERT INTO provaagendadacapitulo (ProvaAgendadaCapituloGUID, ProvaAgendadaGUID, MaterialDidaticoCapituloGUID)
         VALUES (UUID(), ?, ?);`,
        [ProvaAgendadaGUID, capituloGUID]
      );
    }
  };

  buscarCapitulos = async (ProvaAgendadaGUID: string): Promise<string[]> => {
    console.log("🟢 ProvaAgendadaDAO.buscarCapitulos()");

    const SQL = "SELECT MaterialDidaticoCapituloGUID FROM provaagendadacapitulo WHERE ProvaAgendadaGUID = ?;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [ProvaAgendadaGUID]);
    return rows.map((r) => r.MaterialDidaticoCapituloGUID as string);
  };

  /** Bulk pra evitar N+1 em findAll — mapa ProvaAgendadaGUID -> MaterialDidaticoCapituloGUID[]. */
  private buscarCapitulosEmLote = async (provaGUIDs: string[]): Promise<Map<string, string[]>> => {
    const mapa = new Map<string, string[]>();
    if (provaGUIDs.length === 0) return mapa;

    const placeholders = provaGUIDs.map(() => "?").join(", ");
    const SQL = `SELECT ProvaAgendadaGUID, MaterialDidaticoCapituloGUID FROM provaagendadacapitulo WHERE ProvaAgendadaGUID IN (${placeholders});`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, provaGUIDs);

    for (const row of rows) {
      const lista = mapa.get(row.ProvaAgendadaGUID) || [];
      lista.push(row.MaterialDidaticoCapituloGUID);
      mapa.set(row.ProvaAgendadaGUID, lista);
    }
    return mapa;
  };

  findAll = async (filters?: ProvaAgendadaFilters): Promise<ProvaAgendada[]> => {
    console.log("🟢 ProvaAgendadaDAO.findAll()");

    let SQL = "SELECT * FROM provaagendada WHERE 1=1";
    const params: (string | Date)[] = [];

    if (filters?.MateriaGUID) {
      SQL += " AND MateriaGUID = ?";
      params.push(filters.MateriaGUID);
    }

    if (filters?.ProvaStatus) {
      SQL += " AND ProvaStatus = ?";
      params.push(filters.ProvaStatus);
    }

    if (filters?.DataInicio) {
      SQL += " AND ProvaData >= ?";
      params.push(filters.DataInicio);
    }

    if (filters?.DataFim) {
      SQL += " AND ProvaData <= ?";
      params.push(filters.DataFim);
    }

    if (filters?.EscolaGUID) {
      SQL += ` AND EXISTS (
        SELECT 1 FROM provaagendada_turma pat
        INNER JOIN turma t ON t.TurmaGUID = pat.TurmaGUID
        WHERE pat.ProvaAgendadaGUID = provaagendada.ProvaAgendadaGUID
          AND t.EscolaGUID = ?
      )`;
      params.push(filters.EscolaGUID);
    }

    SQL += " ORDER BY ProvaData ASC;";

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProvaAgendadaRow[]>(SQL, params);

    const capitulosPorProva = await this.buscarCapitulosEmLote(rows.map((r) => r.ProvaAgendadaGUID));
    return rows.map((row) => this.mapRowToProva(row, capitulosPorProva.get(row.ProvaAgendadaGUID) || []));
  };

  /**
   * Existe alguma atribuição dessa prova numa turma da escola informada?
   * Usado só pelo guard de chave de API em ProvaAgendadaControl.show — uma
   * prova pode ter turmas de mais de uma escola? Não (turmas são de uma
   * escola só), mas a prova em si não guarda EscolaGUID própria, daí a
   * checagem via pivô em vez de comparar campo a campo.
   */
  pertenceAEscola = async (ProvaAgendadaGUID: string, EscolaGUID: string): Promise<boolean> => {
    console.log("🟢 ProvaAgendadaDAO.pertenceAEscola()");

    const SQL = `
      SELECT EXISTS (
        SELECT 1 FROM provaagendada_turma pat
        INNER JOIN turma t ON t.TurmaGUID = pat.TurmaGUID
        WHERE pat.ProvaAgendadaGUID = ? AND t.EscolaGUID = ?
      ) AS existe
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [ProvaAgendadaGUID, EscolaGUID]);

    return !!(rows[0] as any)?.existe;
  };

  findById = async (ProvaAgendadaGUID: string): Promise<ProvaAgendada | null> => {
    console.log("🟢 ProvaAgendadaDAO.findById()");

    const SQL = "SELECT * FROM provaagendada WHERE ProvaAgendadaGUID = ?;";
    const params = [ProvaAgendadaGUID];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<ProvaAgendadaRow[]>(SQL, params);

    if (rows.length === 0) {
      return null;
    }

    const capitulos = await this.buscarCapitulos(rows[0].ProvaAgendadaGUID);
    return this.mapRowToProva(rows[0], capitulos);
  };

  update = async (
    ProvaAgendadaGUID: string,
    updates: Partial<Pick<ProvaAgendada, "ProvaTitulo" | "ProvaData" | "ProvaDescricao" | "ProvaStatus">> & {
      CapitulosGUIDs?: string[];
    }
  ): Promise<ProvaAgendada | null> => {
    console.log("🟢 ProvaAgendadaDAO.update()");

    const fields: string[] = [];
    const values: (string | Date | null)[] = [];

    if (updates.ProvaTitulo !== undefined) {
      fields.push("ProvaTitulo = ?");
      values.push(updates.ProvaTitulo);
    }

    if (updates.ProvaData !== undefined) {
      fields.push("ProvaData = ?");
      values.push(updates.ProvaData);
    }

    if (updates.ProvaDescricao !== undefined) {
      fields.push("ProvaDescricao = ?");
      values.push(updates.ProvaDescricao);
    }

    if (updates.ProvaStatus !== undefined) {
      fields.push("ProvaStatus = ?");
      values.push(updates.ProvaStatus);
    }

    const pool = await this.#database.getPool();

    if (fields.length > 0) {
      values.push(ProvaAgendadaGUID);
      const SQL = `
        UPDATE provaagendada
        SET ${fields.join(", ")}, UpdatedAt = CURRENT_TIMESTAMP
        WHERE ProvaAgendadaGUID = ?;
      `;
      await pool.execute(SQL, values);
    }

    if (updates.CapitulosGUIDs !== undefined) {
      await this.substituirCapitulos(ProvaAgendadaGUID, updates.CapitulosGUIDs);
    }

    return this.findById(ProvaAgendadaGUID);
  };

  delete = async (ProvaAgendadaGUID: string): Promise<boolean> => {
    console.log("🟢 ProvaAgendadaDAO.delete()");

    const SQL = "DELETE FROM provaagendada WHERE ProvaAgendadaGUID = ?;";
    const params = [ProvaAgendadaGUID];

    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, params);

    return (resultado as ResultSetHeader).affectedRows > 0;
  };

  vincularAnexo = async (ProvaAgendadaGUID: string, AnexoGUID: string): Promise<void> => {
    console.log("🟢 ProvaAgendadaDAO.vincularAnexo()");

    const SQL = `
      INSERT INTO relacaoanexosprova (RelacaoAnexoProvaGUID, AnexoGUID, ProvaAgendadaGUID)
      VALUES (UUID(), ?, ?);
    `;

    const pool = await this.#database.getPool();
    await pool.execute(SQL, [AnexoGUID, ProvaAgendadaGUID]);
  };

  desvincularAnexo = async (ProvaAgendadaGUID: string, AnexoGUID: string): Promise<void> => {
    console.log("🟢 ProvaAgendadaDAO.desvincularAnexo()");

    const SQL = "DELETE FROM relacaoanexosprova WHERE ProvaAgendadaGUID = ? AND AnexoGUID = ?;";

    const pool = await this.#database.getPool();
    await pool.execute(SQL, [ProvaAgendadaGUID, AnexoGUID]);
  };

  /**
   * Busca os anexos (materiais de apoio) vinculados a uma prova — o lado de
   * escrita (vincularAnexo) já existia desde o refactor de normalização;
   * faltava só o de leitura.
   */
  buscarAnexos = async (ProvaAgendadaGUID: string): Promise<ProvaAgendadaAnexoRow[]> => {
    console.log("🟢 ProvaAgendadaDAO.buscarAnexos()");

    const SQL = `
      SELECT a.AnexoGUID, a.AnexoNomeOriginal, a.AnexoCaminho, a.AnexoTamanho
      FROM anexo a
      INNER JOIN relacaoanexosprova rap ON rap.AnexoGUID = a.AnexoGUID
      WHERE rap.ProvaAgendadaGUID = ?
      ORDER BY a.CreatedAt ASC;
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [ProvaAgendadaGUID]);
    return rows as ProvaAgendadaAnexoRow[];
  };

  /**
   * Mapeia uma linha do banco para uma instância de ProvaAgendada
   */
  private mapRowToProva(row: ProvaAgendadaRow, capitulosGUIDs: string[] = []): ProvaAgendada {
    const prova = new ProvaAgendada();
    prova.ProvaAgendadaGUID = row.ProvaAgendadaGUID;
    prova.MateriaGUID = row.MateriaGUID;
    prova.ProvaTitulo = row.ProvaTitulo;
    prova.ProvaData = row.ProvaData;
    prova.ProvaDescricao = row.ProvaDescricao;
    prova.ProvaStatus = row.ProvaStatus;
    prova.CapitulosGUIDs = capitulosGUIDs;
    prova.CriadoPorRepresentanteUsuarioGUID = row.CriadoPorRepresentanteUsuarioGUID;
    prova.ProvaModoAutomatico = !!row.ProvaModoAutomatico;
    prova.ProvaSemanaBase = row.ProvaSemanaBase;
    prova.ProvaDiaSemana = row.ProvaDiaSemana;
    prova.CreatedAt = row.CreatedAt;
    prova.UpdatedAt = row.UpdatedAt;
    return prova;
  }
}
