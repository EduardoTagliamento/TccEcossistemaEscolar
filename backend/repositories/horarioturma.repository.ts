import MysqlDatabase from "../database/MysqlDatabase";
import HorarioTurma from "../entities/horarioturma.model";
import { DiaSemana } from "../utils/gradeHoraria.util";

interface HorarioTurmaRow {
  HorarioTurmaGUID: string;
  TurmaGUID: string;
  MatProfTurGUID: string;
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
  CreatedAt: Date;
  UpdatedAt: Date;
}

export interface HorarioTurmaDetalhado {
  HorarioTurmaGUID: string;
  TurmaGUID: string;
  MatProfTurGUID: string;
  MateriaGUID: string;
  MateriaNome: string;
  UsuarioCPF: string;
  UsuarioNome: string;
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
}

export interface ConflitoProfessor {
  TurmaGUID: string;
  TurmaSerie: string;
  TurmaNome: string;
  MateriaNome: string;
  DiaSemana: DiaSemana;
  HoraInicio: string;
  HoraFim: string;
}

export class HorarioTurmaDAO {
  #database: MysqlDatabase;

  constructor(databaseInstance: MysqlDatabase) {
    console.log("⬆️  HorarioTurmaDAO.constructor()");
    this.#database = databaseInstance;
  }

  create = async (horario: HorarioTurma): Promise<string> => {
    console.log("🟢 HorarioTurmaDAO.create()");

    const SQL = `
      INSERT INTO horarioturma
      (HorarioTurmaGUID, TurmaGUID, MatProfTurGUID, DiaSemana, HoraInicio, HoraFim)
      VALUES (?, ?, ?, ?, ?, ?);
    `;
    const params = [
      horario.HorarioTurmaGUID,
      horario.TurmaGUID,
      horario.MatProfTurGUID,
      horario.DiaSemana,
      horario.HoraInicio,
      horario.HoraFim,
    ];

    const pool = await this.#database.getPool();
    await pool.execute(SQL, params);

    return horario.HorarioTurmaGUID;
  };

  findById = async (horarioTurmaGUID: string): Promise<HorarioTurma | null> => {
    console.log("🟢 HorarioTurmaDAO.findById()");

    const SQL = `SELECT * FROM horarioturma WHERE HorarioTurmaGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [horarioTurmaGUID]);

    const horarios = this.mapRows(rows as HorarioTurmaRow[]);
    return horarios[0] || null;
  };

  /**
   * Lista os slots preenchidos de uma turma, já com o nome da matéria e do
   * professor resolvidos (evita N+1 na tela de montagem do cronograma).
   */
  findDetalhadoByTurma = async (turmaGUID: string): Promise<HorarioTurmaDetalhado[]> => {
    console.log("🟢 HorarioTurmaDAO.findDetalhadoByTurma()");

    const SQL = `
      SELECT
        h.HorarioTurmaGUID, h.TurmaGUID, h.MatProfTurGUID, h.DiaSemana, h.HoraInicio, h.HoraFim,
        m.MateriaGUID, mat.MateriaNome,
        m.UsuarioCPF, u.UsuarioNome
      FROM horarioturma h
      JOIN materiaxprofessorxturma m ON m.MatProfTurGUID = h.MatProfTurGUID
      JOIN materia mat ON mat.MateriaGUID = m.MateriaGUID
      JOIN usuario u ON u.UsuarioCPF = m.UsuarioCPF
      WHERE h.TurmaGUID = ?
      ORDER BY FIELD(h.DiaSemana, 'Segunda','Terca','Quarta','Quinta','Sexta','Sabado','Domingo'), h.HoraInicio
    `;

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [turmaGUID]);

    return rows as HorarioTurmaDetalhado[];
  };

  countByMatProfTur = async (matProfTurGUID: string): Promise<number> => {
    console.log("🟢 HorarioTurmaDAO.countByMatProfTur()");

    const SQL = `SELECT COUNT(*) as total FROM horarioturma WHERE MatProfTurGUID = ?`;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [matProfTurGUID]);

    return (rows as any[])[0]?.total || 0;
  };

  findByTurmaDiaHora = async (
    turmaGUID: string,
    diaSemana: DiaSemana,
    horaInicio: string
  ): Promise<HorarioTurma | null> => {
    console.log("🟢 HorarioTurmaDAO.findByTurmaDiaHora()");

    const SQL = `
      SELECT * FROM horarioturma
      WHERE TurmaGUID = ? AND DiaSemana = ? AND HoraInicio = ?
      LIMIT 1
    `;
    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, [turmaGUID, diaSemana, horaInicio]);

    const horarios = this.mapRows(rows as HorarioTurmaRow[]);
    return horarios[0] || null;
  };

  /**
   * Verifica se o professor da alocação já está ocupado em OUTRA turma no
   * mesmo dia da semana, com sobreposição de horário.
   */
  findConflitoProfessor = async (
    usuarioCPF: string,
    diaSemana: DiaSemana,
    horaInicio: string,
    horaFim: string,
    turmaGUIDExcluir: string
  ): Promise<ConflitoProfessor | null> => {
    console.log("🟢 HorarioTurmaDAO.findConflitoProfessor()");

    const SQL = `
      SELECT
        t.TurmaGUID, t.TurmaSerie, t.TurmaNome,
        mat.MateriaNome,
        h.DiaSemana, h.HoraInicio, h.HoraFim
      FROM horarioturma h
      JOIN materiaxprofessorxturma m ON m.MatProfTurGUID = h.MatProfTurGUID
      JOIN materia mat ON mat.MateriaGUID = m.MateriaGUID
      JOIN turma t ON t.TurmaGUID = h.TurmaGUID
      WHERE m.UsuarioCPF = ?
        AND h.DiaSemana = ?
        AND h.TurmaGUID <> ?
        AND h.HoraInicio < ?
        AND h.HoraFim > ?
      LIMIT 1
    `;
    const params = [usuarioCPF, diaSemana, turmaGUIDExcluir, horaFim, horaInicio];

    const pool = await this.#database.getPool();
    const [rows] = await pool.execute(SQL, params);

    const conflitos = rows as ConflitoProfessor[];
    return conflitos[0] || null;
  };

  delete = async (horarioTurmaGUID: string): Promise<boolean> => {
    console.log("🟢 HorarioTurmaDAO.delete() - remove slot (volta para o banco)");

    const SQL = `DELETE FROM horarioturma WHERE HorarioTurmaGUID = ?`;
    const pool = await this.#database.getPool();
    const [resultado] = await pool.execute(SQL, [horarioTurmaGUID]);

    return (resultado as { affectedRows: number }).affectedRows > 0;
  };

  private mapRows(rows: HorarioTurmaRow[]): HorarioTurma[] {
    return rows.map((row) => {
      const horario = new HorarioTurma();
      horario.HorarioTurmaGUID = row.HorarioTurmaGUID;
      horario.TurmaGUID = row.TurmaGUID;
      horario.MatProfTurGUID = row.MatProfTurGUID;
      horario.DiaSemana = row.DiaSemana;
      horario.HoraInicio = row.HoraInicio;
      horario.HoraFim = row.HoraFim;
      horario.CreatedAt = row.CreatedAt ? new Date(row.CreatedAt) : null;
      horario.UpdatedAt = row.UpdatedAt ? new Date(row.UpdatedAt) : null;
      return horario;
    });
  }
}
