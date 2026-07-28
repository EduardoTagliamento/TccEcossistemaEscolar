import TarefaAcademica from "../entities/tarefaacademica.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket, ResultSetHeader } from "mysql2";

interface TarefaAcademicaRow extends RowDataPacket {
  TarefaGUID: string;
  matXprofXturxescGUID: string;
  TarefaTitulo: string;
  TarefaConteudo: string | null;
  TarefaPostagemData: Date;
  TarefaPrazoData: Date;
  TarefaTipoEntrega: "digital" | "fisica";
  CategoriaGUID: string | null;
  TarefaCompartilhada: boolean;
  TarefaMinPessoas: number | null;
  TarefaMaxPessoas: number | null;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface TarefaAcademicaFilters {
  matXprofXturxescGUID?: string;
  DataInicio?: Date;
  DataFim?: Date;
  TarefaCompartilhada?: boolean;
}

/**
 * Repository (DAO) para a entidade TarefaAcademica (MODELO NORMALIZADO)
 *
 * Responsabilidades:
 * - CRUD completo na tabela `tarefaacademica` (dados únicos da tarefa)
 * - Operações na tabela pivô `relacaoanexostarefa`
 * - Conversão entre rows do MySQL e objetos TarefaAcademica
 * 
 * IMPORTANTE:
 * - Não gerencia mais MatriculaGUID (ver TarefaAcademicaMatriculaDAO)
 * - Uma tarefa agora é única e compartilhada por N alunos
 * - Para atribuir tarefa a alunos, use TarefaAcademicaMatriculaDAO.createBatch()
 */
export class TarefaAcademicaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  TarefaAcademicaDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (tarefa: TarefaAcademica): Promise<TarefaAcademica> => {
    console.log("🟢 TarefaAcademicaDAO.create()");

    const SQL = `
      INSERT INTO tarefaacademica
      (TarefaGUID, matXprofXturxescGUID, TarefaTitulo, TarefaConteudo,
       TarefaPostagemData, TarefaPrazoData, TarefaTipoEntrega, CategoriaGUID,
       TarefaCompartilhada, TarefaMinPessoas, TarefaMaxPessoas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
    `;
    const params = [
      tarefa.TarefaGUID,
      tarefa.matXprofXturxescGUID,
      tarefa.TarefaTitulo,
      tarefa.TarefaConteudo,
      tarefa.TarefaPostagemData,
      tarefa.TarefaPrazoData,
      tarefa.TarefaTipoEntrega,
      tarefa.CategoriaGUID,
      tarefa.TarefaCompartilhada,
      tarefa.TarefaMinPessoas,
      tarefa.TarefaMaxPessoas,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return tarefa;
  };

  /**
   * MÉTODO OBSOLETO - use service layer com TarefaAcademicaMatriculaDAO
   * 
   * Criar múltiplas tarefas em batch não faz mais sentido no modelo normalizado.
   * O correto é:
   * 1. Criar UMA tarefa com TarefaAcademicaDAO.create()
   * 2. Atribuir para N alunos com TarefaAcademicaMatriculaDAO.createBatch()
   */
  createBatch = async (tarefas: TarefaAcademica[]): Promise<TarefaAcademica[]> => {
    throw new Error("createBatch() obsoleto. Use create() + TarefaAcademicaMatriculaDAO.createBatch()");
  };

  findAll = async (filters?: TarefaAcademicaFilters): Promise<TarefaAcademica[]> => {
    console.log("🟢 TarefaAcademicaDAO.findAll()");

    let SQL = "SELECT * FROM tarefaacademica WHERE 1=1";
    const params: any[] = [];

    if (filters?.matXprofXturxescGUID) {
      SQL += " AND matXprofXturxescGUID = ?";
      params.push(filters.matXprofXturxescGUID);
    }

    if (filters?.DataInicio) {
      SQL += " AND TarefaPrazoData >= ?";
      params.push(filters.DataInicio);
    }

    if (filters?.DataFim) {
      SQL += " AND TarefaPrazoData <= ?";
      params.push(filters.DataFim);
    }

    if (filters?.TarefaCompartilhada !== undefined) {
      SQL += " AND TarefaCompartilhada = ?";
      params.push(filters.TarefaCompartilhada);
    }

    SQL += " ORDER BY TarefaPrazoData ASC;";

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRow[]>(SQL, params);

    return rows.map((row) => this.mapRowToTarefa(row));
  };

  findById = async (TarefaGUID: string): Promise<TarefaAcademica | null> => {
    console.log("🟢 TarefaAcademicaDAO.findById()");

    const SQL = "SELECT * FROM tarefaacademica WHERE TarefaGUID = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRow[]>(SQL, [TarefaGUID]);

    if (rows.length === 0) {
      return null;
    }

    return this.mapRowToTarefa(rows[0]);
  };

  update = async (
    TarefaGUID: string,
    updates: Partial<Pick<
      TarefaAcademica,
      "TarefaTitulo" | "TarefaConteudo" | "TarefaPrazoData" | "TarefaTipoEntrega" | "CategoriaGUID" |
      "TarefaCompartilhada" | "TarefaMinPessoas" | "TarefaMaxPessoas"
    >>
  ): Promise<TarefaAcademica | null> => {
    console.log("🟢 TarefaAcademicaDAO.update()");

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.TarefaTitulo !== undefined) {
      fields.push("TarefaTitulo = ?");
      values.push(updates.TarefaTitulo);
    }
    if (updates.TarefaConteudo !== undefined) {
      fields.push("TarefaConteudo = ?");
      values.push(updates.TarefaConteudo);
    }
    if (updates.TarefaPrazoData !== undefined) {
      fields.push("TarefaPrazoData = ?");
      values.push(updates.TarefaPrazoData);
    }
    if (updates.TarefaTipoEntrega !== undefined) {
      fields.push("TarefaTipoEntrega = ?");
      values.push(updates.TarefaTipoEntrega);
    }
    if (updates.CategoriaGUID !== undefined) {
      fields.push("CategoriaGUID = ?");
      values.push(updates.CategoriaGUID);
    }
    if (updates.TarefaCompartilhada !== undefined) {
      fields.push("TarefaCompartilhada = ?");
      values.push(updates.TarefaCompartilhada);
    }
    if (updates.TarefaMinPessoas !== undefined) {
      fields.push("TarefaMinPessoas = ?");
      values.push(updates.TarefaMinPessoas);
    }
    if (updates.TarefaMaxPessoas !== undefined) {
      fields.push("TarefaMaxPessoas = ?");
      values.push(updates.TarefaMaxPessoas);
    }

    if (fields.length === 0) {
      return this.findById(TarefaGUID);
    }

    values.push(TarefaGUID);

    const SQL = `
      UPDATE tarefaacademica
      SET ${fields.join(", ")}
      WHERE TarefaGUID = ?;
    `;

    const pool = await this.#database.getPool();
    await pool.execute(SQL, values);

    return this.findById(TarefaGUID);
  };

  delete = async (TarefaGUID: string): Promise<boolean> => {
    console.log("🟢 TarefaAcademicaDAO.delete()");

    const SQL = "DELETE FROM tarefaacademica WHERE TarefaGUID = ?;";
    const pool = await this.#database.getPool();
    const [result] = await pool.execute<ResultSetHeader>(SQL, [TarefaGUID]);

    return result.affectedRows > 0;
  };

  /**
   * @param TarefaMatriculaGUID Só faz sentido pra tipo "resposta" (entrega do
   * aluno) — é o que restringe o anexo à atribuição de UM aluno específico,
   * em vez de ficar visível/misturado pra todos os alunos da mesma
   * TarefaAcademica compartilhada. Material de apoio (tipo "tarefa") continua
   * null, já que é intencionalmente compartilhado pela turma inteira.
   */
  vincularAnexo = async (
    TarefaGUID: string,
    AnexoGUID: string,
    tipo: "tarefa" | "resposta",
    TarefaMatriculaGUID: string | null = null
  ): Promise<void> => {
    console.log("🟢 TarefaAcademicaDAO.vincularAnexo()");

    // AnexoTipo no banco é ENUM('descricao', 'entrega') — os literais internos
    // "tarefa"/"resposta" usados no resto do código não batem com o enum e
    // seriam rejeitados (ou truncados pra '' fora de modo estrito) pelo MySQL.
    const anexoTipoBanco = tipo === "tarefa" ? "descricao" : "entrega";

    const SQL = `
      INSERT INTO relacaoanexostarefa (RelacaoAnexoTarefaGUID, AnexoGUID, TarefaGUID, TarefaMatriculaGUID, AnexoTipo)
      VALUES (UUID(), ?, ?, ?, ?);
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [AnexoGUID, TarefaGUID, TarefaMatriculaGUID, anexoTipoBanco]);
  };

  desvincularAnexo = async (TarefaGUID: string, AnexoGUID: string): Promise<void> => {
    console.log("🟢 TarefaAcademicaDAO.desvincularAnexo()");

    const SQL = "DELETE FROM relacaoanexostarefa WHERE TarefaGUID = ? AND AnexoGUID = ?;";
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [TarefaGUID, AnexoGUID]);
  };

  /**
   * Vínculo de anexo→tarefa (tipo + dono, quando for entrega) — usado pra
   * validar ownership antes de desvincular (ver TarefaAcademicaService.removerAnexo).
   */
  buscarVinculoAnexo = async (
    TarefaGUID: string,
    AnexoGUID: string
  ): Promise<{ AnexoTipo: "descricao" | "entrega"; TarefaMatriculaGUID: string | null } | null> => {
    console.log("🟢 TarefaAcademicaDAO.buscarVinculoAnexo()");

    const SQL = `
      SELECT AnexoTipo, TarefaMatriculaGUID
      FROM relacaoanexostarefa
      WHERE TarefaGUID = ? AND AnexoGUID = ?
      LIMIT 1;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [TarefaGUID, AnexoGUID]);
    const row = rows[0] as any;
    if (!row) return null;
    return { AnexoTipo: row.AnexoTipo, TarefaMatriculaGUID: row.TarefaMatriculaGUID };
  };

  /**
   * Anexos de entrega (resposta do aluno) por TarefaMatriculaGUID, em lote
   * (evita N+1 ao montar a lista de alunos de uma tarefa). Usado tanto pro
   * aluno ver o que ele mesmo já enviou quanto pelo professor ver a entrega
   * de cada aluno individualmente — nunca uma lista compartilhada.
   */
  buscarAnexosEntregaPorMatricula = async (
    tarefaMatriculaGUIDs: string[]
  ): Promise<Map<string, Array<{ AnexoGUID: string; AnexoNomeOriginal: string | null; AnexoTamanho: number | null; CreatedAt: Date | null }>>> => {
    console.log("🟢 TarefaAcademicaDAO.buscarAnexosEntregaPorMatricula()");

    const unicos = Array.from(new Set(tarefaMatriculaGUIDs));
    const mapa = new Map<string, Array<{ AnexoGUID: string; AnexoNomeOriginal: string | null; AnexoTamanho: number | null; CreatedAt: Date | null }>>();
    if (unicos.length === 0) return mapa;

    const placeholders = unicos.map(() => "?").join(", ");
    const SQL = `
      SELECT rat.TarefaMatriculaGUID, a.AnexoGUID, a.AnexoNomeOriginal, a.AnexoTamanho, a.CreatedAt
      FROM relacaoanexostarefa rat
      INNER JOIN anexo a ON a.AnexoGUID = rat.AnexoGUID
      WHERE rat.TarefaMatriculaGUID IN (${placeholders}) AND rat.AnexoTipo = 'entrega'
      ORDER BY a.CreatedAt ASC;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, unicos);
    for (const row of rows as any[]) {
      const lista = mapa.get(row.TarefaMatriculaGUID) ?? [];
      lista.push({
        AnexoGUID: row.AnexoGUID,
        AnexoNomeOriginal: row.AnexoNomeOriginal,
        AnexoTamanho: row.AnexoTamanho,
        CreatedAt: row.CreatedAt ?? null,
      });
      mapa.set(row.TarefaMatriculaGUID, lista);
    }
    return mapa;
  };

  /**
   * Mapeia uma linha do banco para uma instância de TarefaAcademica
   */
  private mapRowToTarefa(row: TarefaAcademicaRow): TarefaAcademica {
    const tarefa = new TarefaAcademica();
    tarefa.TarefaGUID = row.TarefaGUID;
    tarefa.matXprofXturxescGUID = row.matXprofXturxescGUID;
    tarefa.TarefaTitulo = row.TarefaTitulo;
    tarefa.TarefaConteudo = row.TarefaConteudo;
    tarefa.TarefaPostagemData = row.TarefaPostagemData;
    tarefa.TarefaPrazoData = row.TarefaPrazoData;
    tarefa.TarefaTipoEntrega = row.TarefaTipoEntrega;
    tarefa.CategoriaGUID = row.CategoriaGUID;
    tarefa.TarefaCompartilhada = Boolean(row.TarefaCompartilhada);
    tarefa.TarefaMinPessoas = row.TarefaMinPessoas;
    tarefa.TarefaMaxPessoas = row.TarefaMaxPessoas;
    tarefa.CreatedAt = row.CreatedAt;
    tarefa.UpdatedAt = row.UpdatedAt;
    return tarefa;
  }
}
