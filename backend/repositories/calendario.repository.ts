import MysqlDatabase from "../database/MysqlDatabase";
import { RowDataPacket } from "mysql2";
import {
  CalendarioAviso,
  CalendarioFilters,
  CalendarioTipoAviso,
} from "../entities/calendario.model";

interface CalendarioAvisoRow extends RowDataPacket {
  TipoAviso: CalendarioTipoAviso;
  AvisoId: string;
  MatriculaGUID: string | null;
  DataPrazo: Date;
  Titulo: string;
  Descricao: string | null;
  StatusBoolean: boolean | number | null;
  StatusTexto: string;
  TipoEntrega: "digital" | "fisica" | null;
  QtdAnexosDescricao: number;
  QtdAnexosEntrega: number;
  PermiteMarcarFeito: boolean | number;
  PermiteEnviarAnexo: boolean | number;
  IconeTipo: "tarefa" | "prova";
  CreatedAt: Date | null;
}

export class CalendarioDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  CalendarioDAO.constructor()");
    this.#database = databaseInstance;
  }

  buscarAvisosCalendario = async (
    usuarioCPF: string,
    escolaGUID: string,
    filters?: CalendarioFilters
  ): Promise<CalendarioAviso[]> => {
    console.log("🟢 CalendarioDAO.buscarAvisosCalendario()");

    const query = `
      -- TAREFAS VISÍVEIS AO USUÁRIO (ALUNO OU PROFESSOR)
      -- Modelo normalizado: tarefaacademica + tarefaacademica_matricula
      SELECT
        'tarefa' AS TipoAviso,
        t.TarefaGUID AS AvisoId,
        tm.MatriculaGUID AS MatriculaGUID,
        t.TarefaPrazoData AS DataPrazo,
        t.TarefaTitulo COLLATE utf8mb4_0900_ai_ci AS Titulo,
        t.TarefaConteudo COLLATE utf8mb4_0900_ai_ci AS Descricao,
        tm.TarefaFeito AS StatusBoolean,
        CASE
          WHEN tm.TarefaFeito = 1 THEN 'Feita'
          WHEN t.TarefaPrazoData < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 3 HOUR) THEN 'Atrasada'
          ELSE 'Pendente'
        END COLLATE utf8mb4_0900_ai_ci AS StatusTexto,
        t.TarefaTipoEntrega COLLATE utf8mb4_0900_ai_ci AS TipoEntrega,
        (
          SELECT COUNT(*)
          FROM relacaoanexostarefa rat
          WHERE rat.TarefaGUID = t.TarefaGUID
            AND rat.AnexoTipo = 'tarefa'
        ) AS QtdAnexosDescricao,
        (
          SELECT COUNT(*)
          FROM relacaoanexostarefa rat
          WHERE rat.TarefaGUID = t.TarefaGUID
            AND rat.AnexoTipo = 'resposta'
        ) AS QtdAnexosEntrega,
        TRUE AS PermiteMarcarFeito,
        TRUE AS PermiteEnviarAnexo,
        'tarefa' AS IconeTipo,
        t.TarefaCreatedAt AS CreatedAt
      FROM tarefaacademica t
      INNER JOIN tarefaacademica_matricula tm ON tm.TarefaGUID = t.TarefaGUID
      INNER JOIN matricula m ON m.MatriculaGUID = tm.MatriculaGUID
      INNER JOIN turma tur ON tur.TurmaGUID = m.TurmaGUID
      LEFT JOIN materiaxprofessorxturma mpt ON mpt.MatProfTurGUID = t.matXprofXturxescGUID
      WHERE tur.EscolaGUID = ?
        AND (
          m.UsuarioCPF = ?
          OR (
            mpt.UsuarioCPF = ?
            AND mpt.AlocacaoStatus = 'Ativa'
          )
        )
        AND (? IS NULL OR t.TarefaPrazoData >= ?)
        AND (? IS NULL OR t.TarefaPrazoData <= ?)

      UNION

      -- PROVAS VISÍVEIS AO USUÁRIO (ALUNO OU PROFESSOR)
      -- Modelo normalizado: provaagendada + provaagendada_turma
      SELECT
        'prova' AS TipoAviso,
        p.ProvaAgendadaGUID AS AvisoId,
        NULL AS MatriculaGUID,
        p.ProvaData AS DataPrazo,
        COALESCE(mat.MateriaNome, 'Prova agendada') COLLATE utf8mb4_0900_ai_ci AS Titulo,
        p.ProvaDescricao COLLATE utf8mb4_0900_ai_ci AS Descricao,
        NULL AS StatusBoolean,
        p.ProvaStatus COLLATE utf8mb4_0900_ai_ci AS StatusTexto,
        NULL AS TipoEntrega,
        (
          SELECT COUNT(*)
          FROM relacaoanexosprova rap
          WHERE rap.ProvaAgendadaGUID = p.ProvaAgendadaGUID
        ) AS QtdAnexosDescricao,
        0 AS QtdAnexosEntrega,
        FALSE AS PermiteMarcarFeito,
        FALSE AS PermiteEnviarAnexo,
        'prova' AS IconeTipo,
        p.CreatedAt
      FROM provaagendada p
      INNER JOIN provaagendada_turma pt ON pt.ProvaAgendadaGUID = p.ProvaAgendadaGUID
      INNER JOIN turma tur ON tur.TurmaGUID = pt.TurmaGUID
      INNER JOIN materia mat ON mat.MateriaGUID = p.MateriaGUID
      LEFT JOIN matricula m ON m.TurmaGUID = pt.TurmaGUID
      LEFT JOIN materiaxprofessorxturma mpt
        ON mpt.TurmaGUID = pt.TurmaGUID
       AND mpt.MateriaGUID = p.MateriaGUID
      WHERE tur.EscolaGUID = ?
        AND (
          m.UsuarioCPF = ?
          OR (
            mpt.UsuarioCPF = ?
            AND mpt.AlocacaoStatus = 'Ativa'
          )
        )
        AND (? IS NULL OR p.ProvaData >= ?)
        AND (? IS NULL OR p.ProvaData <= ?)
      ORDER BY DataPrazo ASC;
    `;

    const params = [
      escolaGUID,
      usuarioCPF,
      usuarioCPF,
      filters?.DataInicio || null,
      filters?.DataInicio || null,
      filters?.DataFim || null,
      filters?.DataFim || null,
      escolaGUID,
      usuarioCPF,
      usuarioCPF,
      filters?.DataInicio || null,
      filters?.DataInicio || null,
      filters?.DataFim || null,
      filters?.DataFim || null,
    ];

    console.log("🟢 [CalendarioDAO] Executando query SQL...");
    console.log("🟢 [CalendarioDAO] Params:", { escolaGUID, usuarioCPF, filters });

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<CalendarioAvisoRow[]>(query, params);
    
    console.log("🟢 [CalendarioDAO] Query executada. Rows:", rows.length);
    
    return rows.map((row) => this.mapRow(row));
  };

  buscarDetalhesDia = async (
    usuarioCPF: string,
    escolaGUID: string,
    data: Date,
    filters?: Omit<CalendarioFilters, "DataInicio" | "DataFim">
  ): Promise<CalendarioAviso[]> => {
    console.log("🟢 CalendarioDAO.buscarDetalhesDia()");

    const inicioDia = new Date(data);
    inicioDia.setHours(0, 0, 0, 0);

    const fimDia = new Date(data);
    fimDia.setHours(23, 59, 59, 999);

    return this.buscarAvisosCalendario(usuarioCPF, escolaGUID, {
      ...filters,
      DataInicio: inicioDia,
      DataFim: fimDia,
    });
  };

  private mapRow(row: CalendarioAvisoRow): CalendarioAviso {
    return {
      TipoAviso: row.TipoAviso,
      AvisoId: row.AvisoId,
      MatriculaGUID: row.MatriculaGUID,
      DataPrazo: row.DataPrazo,
      Titulo: row.Titulo,
      Descricao: row.Descricao,
      StatusBoolean:
        row.StatusBoolean === null ? null : Boolean(row.StatusBoolean),
      StatusTexto: row.StatusTexto,
      TipoEntrega: row.TipoEntrega,
      QtdAnexosDescricao: Number(row.QtdAnexosDescricao || 0),
      QtdAnexosEntrega: Number(row.QtdAnexosEntrega || 0),
      PermiteMarcarFeito: Boolean(row.PermiteMarcarFeito),
      PermiteEnviarAnexo: Boolean(row.PermiteEnviarAnexo),
      IconeTipo: row.IconeTipo,
      CreatedAt: row.CreatedAt,
    };
  }
}
