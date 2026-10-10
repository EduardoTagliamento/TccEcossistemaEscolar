import MysqlDatabase from "../database/MysqlDatabase";
import QuestaoBanco, { QuestaoBancoDificuldade, QuestaoBancoStatus } from "../entities/questaobanco.model";

interface QuestaoBancoRow {
  QuestaoBancoGUID: string;
  MateriaGlobalGUID: string;
  SubMateriaGlobalGUID: string;
  VestibularGUID: string;
  Ano: number | null;
  Dificuldade: QuestaoBancoDificuldade;
  Status: QuestaoBancoStatus;
  Enunciado: string;
  VideoResolucaoUrl: string | null;
  CriadoPorGUID: string;
  CreatedAt: Date;
}

export interface QuestaoBancoFiltros {
  MateriaGlobalGUID?: string;
  SubMateriaGlobalGUID?: string;
  Dificuldade?: QuestaoBancoDificuldade;
  VestibularGUID?: string;
  Status?: QuestaoBancoStatus;
  /** Exclui questões que esse aluno já marcou como Feita (spec: some do pool de
   * randomização da prática) — só usado pela listagem pública, nunca pelas telas de admin. */
  ExcluirFeitasDoUsuarioGUID?: string;
  /** Multi-seleção (tela de prática redesenhada, spec 07/10) — independentes dos filtros
   * singulares acima (usados pela tela de admin/validação). */
  VestibularGUIDs?: string[];
  Anos?: number[];
  Dificuldades?: QuestaoBancoDificuldade[];
  /** Busca várias questões específicas por GUID de uma vez (ex.: montar um simulado a partir de
   * uma lista já escolhida) — evita N chamadas a `findById`. */
  QuestaoBancoGUIDs?: string[];
}

/** Campos editáveis via tela de validação — todos opcionais (atualiza só o que vier). */
export interface QuestaoBancoUpdateCampos {
  MateriaGlobalGUID?: string;
  SubMateriaGlobalGUID?: string;
  VestibularGUID?: string;
  Ano?: number | null;
  Dificuldade?: QuestaoBancoDificuldade;
  Status?: QuestaoBancoStatus;
  Enunciado?: string;
  VideoResolucaoUrl?: string | null;
}

export class QuestaoBancoDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  QuestaoBancoDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (questao: QuestaoBanco): Promise<void> => {
    console.log("🟢 QuestaoBancoDAO.create()");

    const SQL = `
      INSERT INTO questaobanco (QuestaoBancoGUID, MateriaGlobalGUID, SubMateriaGlobalGUID, VestibularGUID, Ano, Dificuldade, Enunciado, VideoResolucaoUrl, CriadoPorGUID)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // Status não entra no INSERT — a coluna já nasce 'Pendente' via DEFAULT do schema, mesmo
    // valor que `new QuestaoBanco()` usa antes de qualquer set explícito (entity e banco
    // concordam sem precisar repetir o literal aqui).
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [
      questao.QuestaoBancoGUID,
      questao.MateriaGlobalGUID,
      questao.SubMateriaGlobalGUID,
      questao.VestibularGUID,
      questao.Ano,
      questao.Dificuldade,
      questao.Enunciado,
      questao.VideoResolucaoUrl,
      questao.CriadoPorGUID,
    ]);
  };

  /** Atualiza só os campos informados — usado pela tela de validação (editar enunciado,
   * dificuldade, matéria/submatéria/vestibular) e por `validarQuestao` (Status). */
  update = async (guid: string, campos: QuestaoBancoUpdateCampos): Promise<void> => {
    console.log("🟢 QuestaoBancoDAO.update()");
    const entradas = Object.entries(campos).filter(([, v]) => v !== undefined);
    if (entradas.length === 0) return;

    const SQL = `UPDATE questaobanco SET ${entradas.map(([campo]) => `${campo} = ?`).join(", ")} WHERE QuestaoBancoGUID = ?`;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [...entradas.map(([, v]) => v), guid]);
  };

  findById = async (guid: string): Promise<QuestaoBanco | null> => {
    console.log("🟢 QuestaoBancoDAO.findById()");

    const SQL = `SELECT * FROM questaobanco WHERE QuestaoBancoGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [guid]);

    const lista = this.mapRows(rows as QuestaoBancoRow[]);
    return lista[0] || null;
  };

  /** Busca filtrada direta (spec item 12) — sem chamada de LLM. */
  findAll = async (filtros: QuestaoBancoFiltros): Promise<QuestaoBanco[]> => {
    console.log("🟢 QuestaoBancoDAO.findAll()");

    const pool = await this.#database.getPool();
    const conditions: string[] = [];
    const params: any[] = [];

    if (filtros.MateriaGlobalGUID) {
      conditions.push("MateriaGlobalGUID = ?");
      params.push(filtros.MateriaGlobalGUID);
    }
    if (filtros.SubMateriaGlobalGUID) {
      conditions.push("SubMateriaGlobalGUID = ?");
      params.push(filtros.SubMateriaGlobalGUID);
    }
    if (filtros.Dificuldade) {
      conditions.push("Dificuldade = ?");
      params.push(filtros.Dificuldade);
    }
    if (filtros.VestibularGUID) {
      conditions.push("VestibularGUID = ?");
      params.push(filtros.VestibularGUID);
    }
    if (filtros.Status) {
      conditions.push("Status = ?");
      params.push(filtros.Status);
    }
    if (filtros.ExcluirFeitasDoUsuarioGUID) {
      conditions.push(
        "QuestaoBancoGUID NOT IN (SELECT QuestaoBancoGUID FROM questaobancoprogresso WHERE UsuarioGUID = ? AND Feita = 1)"
      );
      params.push(filtros.ExcluirFeitasDoUsuarioGUID);
    }
    if (filtros.VestibularGUIDs && filtros.VestibularGUIDs.length > 0) {
      conditions.push(`VestibularGUID IN (${filtros.VestibularGUIDs.map(() => "?").join(", ")})`);
      params.push(...filtros.VestibularGUIDs);
    }
    if (filtros.Anos && filtros.Anos.length > 0) {
      conditions.push(`Ano IN (${filtros.Anos.map(() => "?").join(", ")})`);
      params.push(...filtros.Anos);
    }
    if (filtros.Dificuldades && filtros.Dificuldades.length > 0) {
      conditions.push(`Dificuldade IN (${filtros.Dificuldades.map(() => "?").join(", ")})`);
      params.push(...filtros.Dificuldades);
    }
    if (filtros.QuestaoBancoGUIDs && filtros.QuestaoBancoGUIDs.length > 0) {
      conditions.push(`QuestaoBancoGUID IN (${filtros.QuestaoBancoGUIDs.map(() => "?").join(", ")})`);
      params.push(...filtros.QuestaoBancoGUIDs);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const SQL = `SELECT * FROM questaobanco ${whereClause} ORDER BY CreatedAt DESC`;
    const [rows] = await pool.execute(SQL, params);
    return this.mapRows(rows as QuestaoBancoRow[]);
  };

  /** Contagem de Validadas por submatéria (spec: selects de matéria/submatéria mostrarem
   * quanto conteúdo tem disponível) — a contagem por matéria é a soma das submatérias dela,
   * calculada no service, pra não duplicar a mesma lógica de agregação em 2 queries. Aceita os
   * mesmos filtros multi-seleção de `findAll` (spec 07/10: contagem recalcula ao vivo conforme
   * o aluno filtra por vestibular/ano/dificuldade). */
  contarValidadasPorSubMateria = async (
    filtros: Pick<QuestaoBancoFiltros, "VestibularGUIDs" | "Anos" | "Dificuldades"> = {}
  ): Promise<{ MateriaGlobalGUID: string; SubMateriaGlobalGUID: string; Quantidade: number }[]> => {
    console.log("🟢 QuestaoBancoDAO.contarValidadasPorSubMateria()");

    const conditions = ["Status = 'Validado'"];
    const params: any[] = [];

    if (filtros.VestibularGUIDs && filtros.VestibularGUIDs.length > 0) {
      conditions.push(`VestibularGUID IN (${filtros.VestibularGUIDs.map(() => "?").join(", ")})`);
      params.push(...filtros.VestibularGUIDs);
    }
    if (filtros.Anos && filtros.Anos.length > 0) {
      conditions.push(`Ano IN (${filtros.Anos.map(() => "?").join(", ")})`);
      params.push(...filtros.Anos);
    }
    if (filtros.Dificuldades && filtros.Dificuldades.length > 0) {
      conditions.push(`Dificuldade IN (${filtros.Dificuldades.map(() => "?").join(", ")})`);
      params.push(...filtros.Dificuldades);
    }

    const SQL = `
      SELECT MateriaGlobalGUID, SubMateriaGlobalGUID, COUNT(*) as Quantidade
      FROM questaobanco
      WHERE ${conditions.join(" AND ")}
      GROUP BY MateriaGlobalGUID, SubMateriaGlobalGUID
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, params);
    return (rows as any[]).map((r) => ({
      MateriaGlobalGUID: r.MateriaGlobalGUID,
      SubMateriaGlobalGUID: r.SubMateriaGlobalGUID,
      Quantidade: Number(r.Quantidade),
    }));
  };

  /** Contagem de Validadas por Vestibular (spec: modal de filtro de Vestibular mostrar "ENEM
   * (450)") — nunca aplica o próprio filtro de Vestibular (senão vestibulares não selecionados
   * zerariam), só Anos/Dificuldades. Agrupamento por nome-base (ex.: somar todos os anos do
   * ENEM) é feito no frontend, que já tem essa lógica (`useVestibularesAgrupados`). */
  contarValidadasPorVestibular = async (
    filtros: Pick<QuestaoBancoFiltros, "Anos" | "Dificuldades"> = {}
  ): Promise<{ VestibularGUID: string; Quantidade: number }[]> => {
    console.log("🟢 QuestaoBancoDAO.contarValidadasPorVestibular()");

    const conditions = ["Status = 'Validado'"];
    const params: any[] = [];

    if (filtros.Anos && filtros.Anos.length > 0) {
      conditions.push(`Ano IN (${filtros.Anos.map(() => "?").join(", ")})`);
      params.push(...filtros.Anos);
    }
    if (filtros.Dificuldades && filtros.Dificuldades.length > 0) {
      conditions.push(`Dificuldade IN (${filtros.Dificuldades.map(() => "?").join(", ")})`);
      params.push(...filtros.Dificuldades);
    }

    const SQL = `
      SELECT VestibularGUID, COUNT(*) as Quantidade
      FROM questaobanco
      WHERE ${conditions.join(" AND ")}
      GROUP BY VestibularGUID
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, params);
    return (rows as any[]).map((r) => ({ VestibularGUID: r.VestibularGUID, Quantidade: Number(r.Quantidade) }));
  };

  /** Anos distintos com pelo menos 1 questão Validada — alimenta o modal de filtro de Ano. */
  listarAnosDisponiveis = async (): Promise<number[]> => {
    console.log("🟢 QuestaoBancoDAO.listarAnosDisponiveis()");

    const SQL = `
      SELECT DISTINCT Ano FROM questaobanco
      WHERE Status = 'Validado' AND Ano IS NOT NULL
      ORDER BY Ano DESC
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL);
    return (rows as any[]).map((r) => Number(r.Ano));
  };

  /** Só existência (spec: passo "banco de questões" do pipeline só precisa saber se há alguma). */
  existeParaSubMateria = async (subMateriaGlobalGUID: string): Promise<boolean> => {
    console.log("🟢 QuestaoBancoDAO.existeParaSubMateria()");

    const SQL = `SELECT 1 FROM questaobanco WHERE SubMateriaGlobalGUID = ? LIMIT 1`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [subMateriaGlobalGUID]);
    return (rows as unknown[]).length > 0;
  };

  delete = async (guid: string): Promise<boolean> => {
    console.log("🟢 QuestaoBancoDAO.delete()");

    const SQL = `DELETE FROM questaobanco WHERE QuestaoBancoGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [guid]);
    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRows(rows: QuestaoBancoRow[]): QuestaoBanco[] {
    return rows.map((row) => {
      const questao = new QuestaoBanco();
      questao.QuestaoBancoGUID = row.QuestaoBancoGUID;
      questao.MateriaGlobalGUID = row.MateriaGlobalGUID;
      questao.SubMateriaGlobalGUID = row.SubMateriaGlobalGUID;
      questao.VestibularGUID = row.VestibularGUID;
      questao.Ano = row.Ano;
      questao.Dificuldade = row.Dificuldade;
      questao.Status = row.Status;
      questao.Enunciado = row.Enunciado;
      questao.VideoResolucaoUrl = row.VideoResolucaoUrl;
      questao.CriadoPorGUID = row.CriadoPorGUID;
      questao.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
      return questao;
    });
  }
}
