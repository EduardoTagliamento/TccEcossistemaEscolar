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
      SELECT
        'tarefa' AS TipoAviso,
        t.TarefaGUID AS AvisoId,
        t.TarefaPrazoData AS DataPrazo,
        t.TarefaTitulo AS Titulo,
        t.TarefaConteudo AS Descricao,
        t.TarefaFeito AS StatusBoolean,
        CASE
          WHEN t.TarefaFeito = 1 THEN 'Feita'
          WHEN t.TarefaPrazoData < NOW() THEN 'Atrasada'
          ELSE 'Pendente'
        END AS StatusTexto,
        t.TarefaTipoEntrega AS TipoEntrega,
        (
          SELECT COUNT(*)
          FROM relacaoanexostarefa rat
          WHERE rat.TarefaGUID = t.TarefaGUID
            AND rat.AnexoTipo = 'descricao'
        ) AS QtdAnexosDescricao,
        (
          SELECT COUNT(*)
          FROM relacaoanexostarefa rat
          WHERE rat.TarefaGUID = t.TarefaGUID
            AND rat.AnexoTipo = 'entrega'
        ) AS QtdAnexosEntrega,
        TRUE AS PermiteMarcarFeito,
        TRUE AS PermiteEnviarAnexo,
        'tarefa' AS IconeTipo,
        t.CreatedAt
      FROM tarefaacademica t
      INNER JOIN matricula m ON m.MatriculaGUID = t.MatriculaGUID
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
      SELECT
        'prova' AS TipoAviso,
        p.ProvaAgendadaGUID AS AvisoId,
        p.ProvaData AS DataPrazo,
        COALESCE(mat.MateriaNome, 'Prova agendada') AS Titulo,
        p.ProvaDescricao AS Descricao,
        NULL AS StatusBoolean,
        p.ProvaStatus AS StatusTexto,
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
      INNER JOIN turma tur ON tur.TurmaGUID = p.TurmaGUID
      INNER JOIN materia mat ON mat.MateriaGUID = p.MateriaGUID
      LEFT JOIN matricula m ON m.TurmaGUID = p.TurmaGUID
      LEFT JOIN materiaxprofessorxturma mpt
        ON mpt.TurmaGUID = p.TurmaGUID
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

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute<CalendarioAvisoRow[]>(query, params);
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
