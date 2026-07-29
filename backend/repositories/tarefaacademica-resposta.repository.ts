import TarefaAcademicaResposta from "../entities/tarefaacademica-resposta.model";
import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket } from "mysql2";

interface TarefaAcademicaRespostaRow extends RowDataPacket {
  RespostaGUID: string;
  TarefaMatriculaGUID: string;
  QuestaoGUID: string;
  AlternativaGUID: string | null;
  RespostaTextoDiscursiva: string | null;
  RespostaPontosObtidos: number | null;
  RespostaAvaliadoEm: Date | null;
  RespostaAvaliadoPorCPF: string | null;
  RespondidoEm: Date;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface AgregadoAlunoLista {
  TarefaMatriculaGUID: string;
  TotalQuestoes: number;
  QuestoesRespondidas: number;
  QuestoesCorrigidas: number;
  QuestoesDiscursivasPendentes: number;
  PontosObtidos: number;
  PontosMaximosTotal: number;
}

/**
 * Repository (DAO) para a entidade TarefaAcademicaResposta — resposta de UM
 * aluno (via TarefaMatriculaGUID) a UMA questão de uma tarefa "lista".
 */
export class TarefaAcademicaRespostaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  TarefaAcademicaRespostaDAO.constructor()");
    this.#database = databaseInstance;
  }

  /**
   * Resposta a questão objetiva — correção automática (pontos já resolvidos
   * na hora, resolvidos pelo caller a partir de AlternativaPontos).
   * INSERT ... ON DUPLICATE KEY UPDATE na uq_resposta(TarefaMatriculaGUID,
   * QuestaoGUID): permite o aluno trocar de alternativa antes de fechar a lista.
   */
  upsertObjetiva = async (
    TarefaMatriculaGUID: string,
    QuestaoGUID: string,
    AlternativaGUID: string,
    pontosObtidos: number
  ): Promise<TarefaAcademicaResposta> => {
    console.log("🟢 TarefaAcademicaRespostaDAO.upsertObjetiva()");

    const SQL = `
      INSERT INTO tarefaacademica_resposta
      (RespostaGUID, TarefaMatriculaGUID, QuestaoGUID, AlternativaGUID, RespostaTextoDiscursiva,
       RespostaPontosObtidos, RespostaAvaliadoEm, RespostaAvaliadoPorCPF, RespondidoEm)
      VALUES (UUID(), ?, ?, ?, NULL, ?, NOW(), NULL, NOW())
      ON DUPLICATE KEY UPDATE
        AlternativaGUID = VALUES(AlternativaGUID),
        RespostaTextoDiscursiva = NULL,
        RespostaPontosObtidos = VALUES(RespostaPontosObtidos),
        RespostaAvaliadoEm = NOW(),
        RespostaAvaliadoPorCPF = NULL,
        RespondidoEm = NOW();
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [TarefaMatriculaGUID, QuestaoGUID, AlternativaGUID, pontosObtidos]);

    const resposta = await this.findByMatriculaAndQuestao(TarefaMatriculaGUID, QuestaoGUID);
    return resposta!;
  };

  /**
   * Resposta a questão discursiva — pontos ficam null até correção manual.
   * Reeditar a resposta (antes de fechar a lista) reseta uma correção
   * anterior, já que o texto mudou.
   */
  upsertDiscursiva = async (
    TarefaMatriculaGUID: string,
    QuestaoGUID: string,
    texto: string
  ): Promise<TarefaAcademicaResposta> => {
    console.log("🟢 TarefaAcademicaRespostaDAO.upsertDiscursiva()");

    const SQL = `
      INSERT INTO tarefaacademica_resposta
      (RespostaGUID, TarefaMatriculaGUID, QuestaoGUID, AlternativaGUID, RespostaTextoDiscursiva,
       RespostaPontosObtidos, RespostaAvaliadoEm, RespostaAvaliadoPorCPF, RespondidoEm)
      VALUES (UUID(), ?, ?, NULL, ?, NULL, NULL, NULL, NOW())
      ON DUPLICATE KEY UPDATE
        AlternativaGUID = NULL,
        RespostaTextoDiscursiva = VALUES(RespostaTextoDiscursiva),
        RespostaPontosObtidos = NULL,
        RespostaAvaliadoEm = NULL,
        RespostaAvaliadoPorCPF = NULL,
        RespondidoEm = NOW();
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [TarefaMatriculaGUID, QuestaoGUID, texto]);

    const resposta = await this.findByMatriculaAndQuestao(TarefaMatriculaGUID, QuestaoGUID);
    return resposta!;
  };

  /** Professor corrige uma resposta discursiva (atribui pontos por questão). */
  gradeDiscursiva = async (
    RespostaGUID: string,
    pontos: number,
    professorCPF: string
  ): Promise<TarefaAcademicaResposta | null> => {
    console.log("🟢 TarefaAcademicaRespostaDAO.gradeDiscursiva()");

    const SQL = `
      UPDATE tarefaacademica_resposta
      SET RespostaPontosObtidos = ?, RespostaAvaliadoEm = NOW(), RespostaAvaliadoPorCPF = ?
      WHERE RespostaGUID = ?;
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [pontos, professorCPF, RespostaGUID]);

    return this.findById(RespostaGUID);
  };

  findById = async (RespostaGUID: string): Promise<TarefaAcademicaResposta | null> => {
    const SQL = "SELECT * FROM tarefaacademica_resposta WHERE RespostaGUID = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRespostaRow[]>(SQL, [RespostaGUID]);
    if (rows.length === 0) return null;
    return this.mapRowToResposta(rows[0]);
  };

  findByMatriculaAndQuestao = async (
    TarefaMatriculaGUID: string,
    QuestaoGUID: string
  ): Promise<TarefaAcademicaResposta | null> => {
    const SQL = "SELECT * FROM tarefaacademica_resposta WHERE TarefaMatriculaGUID = ? AND QuestaoGUID = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRespostaRow[]>(SQL, [TarefaMatriculaGUID, QuestaoGUID]);
    if (rows.length === 0) return null;
    return this.mapRowToResposta(rows[0]);
  };

  findByMatricula = async (TarefaMatriculaGUID: string): Promise<TarefaAcademicaResposta[]> => {
    console.log("🟢 TarefaAcademicaRespostaDAO.findByMatricula()");

    const SQL = "SELECT * FROM tarefaacademica_resposta WHERE TarefaMatriculaGUID = ?;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRespostaRow[]>(SQL, [TarefaMatriculaGUID]);
    return rows.map((row) => this.mapRowToResposta(row));
  };

  /** Respostas por matrícula, em lote — evita N+1 ao montar o board do professor. */
  findByMatriculas = async (tarefaMatriculaGUIDs: string[]): Promise<Map<string, TarefaAcademicaResposta[]>> => {
    console.log("🟢 TarefaAcademicaRespostaDAO.findByMatriculas()");

    const unicos = Array.from(new Set(tarefaMatriculaGUIDs));
    const mapa = new Map<string, TarefaAcademicaResposta[]>();
    if (unicos.length === 0) return mapa;

    const placeholders = unicos.map(() => "?").join(", ");
    const SQL = `SELECT * FROM tarefaacademica_resposta WHERE TarefaMatriculaGUID IN (${placeholders});`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<TarefaAcademicaRespostaRow[]>(SQL, unicos);

    for (const row of rows) {
      const resposta = this.mapRowToResposta(row);
      const lista = mapa.get(resposta.TarefaMatriculaGUID) ?? [];
      lista.push(resposta);
      mapa.set(resposta.TarefaMatriculaGUID, lista);
    }
    return mapa;
  };

  contarRespondidas = async (TarefaMatriculaGUID: string): Promise<number> => {
    const SQL = "SELECT COUNT(*) AS total FROM tarefaacademica_resposta WHERE TarefaMatriculaGUID = ?;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [TarefaMatriculaGUID]);
    return Number((rows[0] as any)?.total ?? 0);
  };

  /** true se alguma resposta já foi registrada pra essa questão (por qualquer aluno) — usado pra bloquear edição estrutural. */
  existeRespostaParaQuestao = async (QuestaoGUID: string): Promise<boolean> => {
    const SQL = "SELECT 1 FROM tarefaacademica_resposta WHERE QuestaoGUID = ? LIMIT 1;";
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [QuestaoGUID]);
    return rows.length > 0;
  };

  /**
   * CPF do professor que corrigiu alguma discursiva dessa matrícula, ou null
   * se todas as questões corrigidas até agora foram automáticas (só
   * objetivas) — usado pra decidir TarefaAvaliadoPorCPF no settle final
   * (mantém o sinal canônico de "correção automática vs. humana").
   */
  buscarAvaliadorHumano = async (TarefaMatriculaGUID: string): Promise<string | null> => {
    const SQL = `
      SELECT RespostaAvaliadoPorCPF FROM tarefaacademica_resposta
      WHERE TarefaMatriculaGUID = ? AND RespostaAvaliadoPorCPF IS NOT NULL
      LIMIT 1;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [TarefaMatriculaGUID]);
    return (rows[0] as any)?.RespostaAvaliadoPorCPF ?? null;
  };

  /** true se alguma resposta já foi registrada pra qualquer questão dessa tarefa — usado pra bloquear alterar TemRespostas. */
  existeRespostaParaTarefa = async (TarefaGUID: string): Promise<boolean> => {
    const SQL = `
      SELECT 1 FROM tarefaacademica_resposta r
      INNER JOIN tarefaacademica_questao q ON q.QuestaoGUID = r.QuestaoGUID
      WHERE q.TarefaGUID = ?
      LIMIT 1;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [TarefaGUID]);
    return rows.length > 0;
  };

  /**
   * Agregado por aluno (questões totais/respondidas/corrigidas + pontos),
   * em lote — base do cálculo de Estado/Percentual ao vivo do board
   * (CategoriaConteudoService) e de buscarEstatisticasItem. 1 query por
   * chamada de board, não por item.
   */
  buscarAgregadoPorAluno = async (
    tarefaMatriculaGUIDs: string[]
  ): Promise<Map<string, AgregadoAlunoLista>> => {
    console.log("🟢 TarefaAcademicaRespostaDAO.buscarAgregadoPorAluno()");

    const unicos = Array.from(new Set(tarefaMatriculaGUIDs));
    const mapa = new Map<string, AgregadoAlunoLista>();
    if (unicos.length === 0) return mapa;

    const placeholders = unicos.map(() => "?").join(", ");
    const SQL = `
      SELECT tm.TarefaMatriculaGUID,
             COUNT(q.QuestaoGUID) AS TotalQuestoes,
             SUM(CASE WHEN r.RespostaGUID IS NOT NULL THEN 1 ELSE 0 END) AS QuestoesRespondidas,
             SUM(CASE WHEN r.RespostaPontosObtidos IS NOT NULL THEN 1 ELSE 0 END) AS QuestoesCorrigidas,
             SUM(CASE WHEN q.QuestaoTipo = 'discursiva' AND r.RespostaGUID IS NOT NULL AND r.RespostaPontosObtidos IS NULL THEN 1 ELSE 0 END) AS QuestoesDiscursivasPendentes,
             COALESCE(SUM(r.RespostaPontosObtidos), 0) AS PontosObtidos,
             COALESCE(SUM(q.QuestaoPontosMaximos), 0) AS PontosMaximosTotal
      FROM tarefaacademica_matricula tm
      INNER JOIN tarefaacademica_questao q ON q.TarefaGUID = tm.TarefaGUID
      LEFT JOIN tarefaacademica_resposta r ON r.QuestaoGUID = q.QuestaoGUID AND r.TarefaMatriculaGUID = tm.TarefaMatriculaGUID
      WHERE tm.TarefaMatriculaGUID IN (${placeholders})
      GROUP BY tm.TarefaMatriculaGUID;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, unicos);

    for (const row of rows as any[]) {
      mapa.set(row.TarefaMatriculaGUID, {
        TarefaMatriculaGUID: row.TarefaMatriculaGUID,
        TotalQuestoes: Number(row.TotalQuestoes),
        QuestoesRespondidas: Number(row.QuestoesRespondidas),
        QuestoesCorrigidas: Number(row.QuestoesCorrigidas),
        QuestoesDiscursivasPendentes: Number(row.QuestoesDiscursivasPendentes),
        PontosObtidos: Number(row.PontosObtidos),
        PontosMaximosTotal: Number(row.PontosMaximosTotal),
      });
    }
    return mapa;
  };

  /**
   * Todas as respostas de uma tarefa lista, com dados de questão/aluno já
   * resolvidos — base de buscarEstatisticasPorQuestao (estatística quebrada
   * por questão, Seção 4.5 do plano).
   */
  buscarRespostasComContextoPorTarefa = async (
    TarefaGUID: string
  ): Promise<Array<{
    QuestaoGUID: string;
    QuestaoOrdem: number;
    QuestaoEnunciado: string;
    QuestaoTipo: "objetiva" | "discursiva";
    QuestaoPontosMaximos: number;
    TarefaMatriculaGUID: string;
    MatriculaGUID: string;
    AlunoNome: string;
    RespostaGUID: string | null;
    AlternativaTexto: string | null;
    RespostaTextoDiscursiva: string | null;
    RespostaPontosObtidos: number | null;
  }>> => {
    console.log("🟢 TarefaAcademicaRespostaDAO.buscarRespostasComContextoPorTarefa()");

    const SQL = `
      SELECT q.QuestaoGUID, q.QuestaoOrdem, q.QuestaoEnunciado, q.QuestaoTipo, q.QuestaoPontosMaximos,
             tm.TarefaMatriculaGUID, tm.MatriculaGUID, u.UsuarioNome AS AlunoNome,
             r.RespostaGUID, alt.AlternativaTexto, r.RespostaTextoDiscursiva, r.RespostaPontosObtidos
      FROM tarefaacademica_questao q
      INNER JOIN tarefaacademica_matricula tm ON tm.TarefaGUID = q.TarefaGUID
      INNER JOIN matricula m ON m.MatriculaGUID = tm.MatriculaGUID
      INNER JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF
      LEFT JOIN tarefaacademica_resposta r ON r.QuestaoGUID = q.QuestaoGUID AND r.TarefaMatriculaGUID = tm.TarefaMatriculaGUID
      LEFT JOIN tarefaacademica_alternativa alt ON alt.AlternativaGUID = r.AlternativaGUID
      WHERE q.TarefaGUID = ?
      ORDER BY q.QuestaoOrdem ASC, u.UsuarioNome ASC;
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(SQL, [TarefaGUID]);
    return rows as any[];
  };

  /**
   * Prazo vencido com lista incompleta (decisão confirmada com o usuário):
   * insere resposta em branco (0 pontos, sem alternativa/texto) pra cada
   * questão que o aluno ainda não respondeu, fechando a lacuna de forma
   * permanente — usado só pelo scheduler (ver tarefaacademicanota.scheduler.ts).
   */
  inserirRespostasEmBranco = async (TarefaGUID: string, TarefaMatriculaGUID: string): Promise<void> => {
    console.log("🟢 TarefaAcademicaRespostaDAO.inserirRespostasEmBranco()");

    const SQL = `
      INSERT INTO tarefaacademica_resposta
      (RespostaGUID, TarefaMatriculaGUID, QuestaoGUID, RespostaPontosObtidos, RespostaAvaliadoEm, RespostaAvaliadoPorCPF)
      SELECT UUID(), ?, q.QuestaoGUID, 0, NOW(), NULL
      FROM tarefaacademica_questao q
      WHERE q.TarefaGUID = ?
        AND NOT EXISTS (
          SELECT 1 FROM tarefaacademica_resposta r
          WHERE r.QuestaoGUID = q.QuestaoGUID AND r.TarefaMatriculaGUID = ?
        );
    `;
    const pool = await this.#database.getPool();
    await pool.execute(SQL, [TarefaMatriculaGUID, TarefaGUID, TarefaMatriculaGUID]);
  };

  private mapRowToResposta(row: TarefaAcademicaRespostaRow): TarefaAcademicaResposta {
    const resposta = new TarefaAcademicaResposta();
    resposta.RespostaGUID = row.RespostaGUID;
    resposta.TarefaMatriculaGUID = row.TarefaMatriculaGUID;
    resposta.QuestaoGUID = row.QuestaoGUID;
    resposta.AlternativaGUID = row.AlternativaGUID;
    resposta.RespostaTextoDiscursiva = row.RespostaTextoDiscursiva;
    resposta.RespostaPontosObtidos = row.RespostaPontosObtidos;
    resposta.RespostaAvaliadoEm = row.RespostaAvaliadoEm;
    resposta.RespostaAvaliadoPorCPF = row.RespostaAvaliadoPorCPF;
    resposta.RespondidoEm = row.RespondidoEm;
    resposta.CreatedAt = row.CreatedAt;
    resposta.UpdatedAt = row.UpdatedAt;
    return resposta;
  }
}
